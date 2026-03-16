const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey_change_in_prod';
const DB_PATH = path.join(__dirname, 'data.json');
const FRONTEND_PATH = path.join(__dirname, '..', 'frontend');

// --- Persistencia JSON ---
function loadDb() {
  if (!fs.existsSync(DB_PATH)) return { usuarios: [], notas: [] };
  try { return JSON.parse(fs.readFileSync(DB_PATH, 'utf8')); } 
  catch { return { usuarios: [], notas: [] }; }
}

function saveDb(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

function nextId(arr) {
  return arr.length === 0 ? 1 : Math.max(...arr.map(x => x.id)) + 1;
}

// --- Middleware ---
app.use(cors());
app.use(express.json());
app.use(express.static(FRONTEND_PATH));

function auth(req, res, next) {
  const header = req.headers['authorization'];
  if (!header) return res.status(401).json({ error: 'Token requerido' });
  const token = header.split(' ')[1];
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

// --- AUTH ---

app.post('/api/register', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email y contraseña requeridos' });
  if (password.length < 6) return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Email inválido' });

  const db = loadDb();
  const emailNorm = email.toLowerCase().trim();
  if (db.usuarios.find(u => u.email === emailNorm)) return res.status(409).json({ error: 'El email ya está registrado' });

  const user = { id: nextId(db.usuarios), email: emailNorm, password: bcrypt.hashSync(password, 10), created_at: new Date().toISOString() };
  db.usuarios.push(user);
  saveDb(db);

  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
  res.status(201).json({ token, email: user.email });
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email y contraseña requeridos' });

  const db = loadDb();
  const user = db.usuarios.find(u => u.email === email.toLowerCase().trim());
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Credenciales incorrectas' });
  }
  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, email: user.email });
});

// --- NOTAS ---

app.get('/api/notas', auth, (req, res) => {
  const db = loadDb();
  const notas = db.notas
    .filter(n => n.user_id === req.user.id)
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
    .map(({ id, titulo, contenido, created_at, updated_at }) => ({ id, titulo, contenido, created_at, updated_at }));
  res.json(notas);
});

app.post('/api/notas', auth, (req, res) => {
  const { titulo, contenido } = req.body;
  if (!titulo || !titulo.trim()) return res.status(400).json({ error: 'El título es requerido' });
  if (!contenido || !contenido.trim()) return res.status(400).json({ error: 'El contenido es requerido' });
  if (titulo.length > 200) return res.status(400).json({ error: 'Título demasiado largo (máx. 200 caracteres)' });
  if (contenido.length > 10000) return res.status(400).json({ error: 'Contenido demasiado largo (máx. 10000 caracteres)' });

  const db = loadDb();
  const now = new Date().toISOString();
  const nota = { id: nextId(db.notas), user_id: req.user.id, titulo: titulo.trim(), contenido: contenido.trim(), created_at: now, updated_at: now };
  db.notas.push(nota);
  saveDb(db);
  const { user_id, ...notaPublica } = nota;
  res.status(201).json(notaPublica);
});

app.get('/api/notas/:id', auth, (req, res) => {
  const db = loadDb();
  const nota = db.notas.find(n => n.id === Number(req.params.id) && n.user_id === req.user.id);
  if (!nota) return res.status(404).json({ error: 'Nota no encontrada' });
  const { user_id, ...notaPublica } = nota;
  res.json(notaPublica);
});

app.put('/api/notas/:id', auth, (req, res) => {
  const { titulo, contenido } = req.body;
  if (!titulo || !titulo.trim()) return res.status(400).json({ error: 'El título es requerido' });
  if (!contenido || !contenido.trim()) return res.status(400).json({ error: 'El contenido es requerido' });
  if (titulo.length > 200) return res.status(400).json({ error: 'Título demasiado largo (máx. 200 caracteres)' });
  if (contenido.length > 10000) return res.status(400).json({ error: 'Contenido demasiado largo (máx. 10000 caracteres)' });

  const db = loadDb();
  const nota = db.notas.find(n => n.id === Number(req.params.id) && n.user_id === req.user.id);
  if (!nota) return res.status(404).json({ error: 'Nota no encontrada' });

  nota.titulo = titulo.trim();
  nota.contenido = contenido.trim();
  nota.updated_at = new Date().toISOString();
  saveDb(db);
  const { user_id, ...notaPublica } = nota;
  res.json(notaPublica);
});

app.delete('/api/notas/:id', auth, (req, res) => {
  const db = loadDb();
  const idx = db.notas.findIndex(n => n.id === Number(req.params.id) && n.user_id === req.user.id);
  if (idx === -1) return res.status(404).json({ error: 'Nota no encontrada' });
  db.notas.splice(idx, 1);
  saveDb(db);
  res.json({ message: 'Nota eliminada' });
});

app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));
