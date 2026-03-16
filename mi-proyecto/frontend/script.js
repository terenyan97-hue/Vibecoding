const API = 'http://localhost:3000/api';
let currentNoteId = null;
let notes = [];

// --- INIT ---
window.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token');
  if (token) showApp();
});

// --- AUTH TABS ---
function showTab(tab) {
  document.getElementById('login-form').classList.toggle('hidden', tab !== 'login');
  document.getElementById('register-form').classList.toggle('hidden', tab !== 'register');
  document.querySelectorAll('.tab').forEach((t, i) => {
    t.classList.toggle('active', (i === 0 && tab === 'login') || (i === 1 && tab === 'register'));
  });
}

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  const errEl = document.getElementById('login-error');
  errEl.textContent = '';
  try {
    const res = await fetch(`${API}/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) return (errEl.textContent = data.error);
    localStorage.setItem('token', data.token);
    localStorage.setItem('email', data.email);
    showApp();
  } catch { errEl.textContent = 'Error de conexión con el servidor'; }
}

async function handleRegister(e) {
  e.preventDefault();
  const email = document.getElementById('reg-email').value;
  const password = document.getElementById('reg-password').value;
  const confirm = document.getElementById('reg-confirm').value;
  const errEl = document.getElementById('register-error');
  errEl.textContent = '';
  if (password !== confirm) return (errEl.textContent = 'Las contraseñas no coinciden');
  try {
    const res = await fetch(`${API}/register`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) return (errEl.textContent = data.error);
    localStorage.setItem('token', data.token);
    localStorage.setItem('email', data.email);
    showApp();
  } catch { errEl.textContent = 'Error de conexión con el servidor'; }
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('email');
  currentNoteId = null;
  notes = [];
  document.getElementById('app-section').classList.add('hidden');
  document.getElementById('auth-section').classList.remove('hidden');
  document.getElementById('login-form').reset();
  document.getElementById('register-form').reset();
}

// --- APP ---
function showApp() {
  document.getElementById('auth-section').classList.add('hidden');
  document.getElementById('app-section').classList.remove('hidden');
  document.getElementById('user-email').textContent = localStorage.getItem('email');
  loadNotes();
}

function authHeaders() {
  return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` };
}

async function loadNotes() {
  try {
    const res = await fetch(`${API}/notas`, { headers: authHeaders() });
    if (res.status === 401) return logout();
    notes = await res.json();
    renderNotesList();
  } catch { console.error('Error cargando notas'); }
}

function renderNotesList() {
  const container = document.getElementById('notes-items');
  if (!notes.length) {
    container.innerHTML = '<p class="no-notes">No tienes notas aún.<br>¡Crea una nueva!</p>';
    return;
  }
  container.innerHTML = notes.map(n => `
    <div class="note-item ${Number(n.id) === Number(currentNoteId) ? 'active' : ''}" onclick="openNote(${n.id})">
      <div class="note-item-title">${escHtml(n.titulo)}</div>
      <div class="note-item-preview">${escHtml(n.contenido)}</div>
      <div class="note-item-date">${formatDate(n.updated_at)}</div>
    </div>
  `).join('');
}

function openNote(id) {
  const nota = notes.find(n => Number(n.id) === Number(id));
  if (!nota) return;
  currentNoteId = id;
  document.getElementById('note-title').value = nota.titulo;
  document.getElementById('note-content').value = nota.contenido;
  document.getElementById('empty-state').classList.add('hidden');
  document.getElementById('note-editor').classList.remove('hidden');
  document.getElementById('editor-error').textContent = '';
  document.getElementById('save-status').textContent = '';
  renderNotesList();
}

function newNote() {
  currentNoteId = null;
  document.getElementById('note-title').value = '';
  document.getElementById('note-content').value = '';
  document.getElementById('empty-state').classList.add('hidden');
  document.getElementById('note-editor').classList.remove('hidden');
  document.getElementById('editor-error').textContent = '';
  document.getElementById('save-status').textContent = '';
  document.querySelectorAll('.note-item').forEach(el => el.classList.remove('active'));
  document.getElementById('note-title').focus();
}

async function saveNote() {
  const titulo = document.getElementById('note-title').value.trim();
  const contenido = document.getElementById('note-content').value.trim();
  const errEl = document.getElementById('editor-error');
  const statusEl = document.getElementById('save-status');
  errEl.textContent = '';
  statusEl.textContent = '';

  if (!titulo) return (errEl.textContent = 'El título no puede estar vacío');
  if (!contenido) return (errEl.textContent = 'El contenido no puede estar vacío');

  try {
    const url = currentNoteId ? `${API}/notas/${currentNoteId}` : `${API}/notas`;
    const method = currentNoteId ? 'PUT' : 'POST';
    const res = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify({ titulo, contenido }) });
    if (res.status === 401) return logout();
    const data = await res.json();
    if (!res.ok) return (errEl.textContent = data.error);
    currentNoteId = Number(data.id);
    statusEl.textContent = 'Guardado ✓';
    setTimeout(() => (statusEl.textContent = ''), 2000);
    // Recargar lista sin abrir la nota de nuevo
    const res2 = await fetch(`${API}/notas`, { headers: authHeaders() });
    if (res2.status === 401) return logout();
    notes = await res2.json();
    renderNotesList();
  } catch (e) { console.error('Error saveNote:', e); errEl.textContent = 'Error al guardar'; }
}

async function deleteNote() {
  if (!currentNoteId) return;
  if (!confirm('¿Eliminar esta nota?')) return;
  try {
    const res = await fetch(`${API}/notas/${currentNoteId}`, { method: 'DELETE', headers: authHeaders() });
    if (res.status === 401) return logout();
    currentNoteId = null;
    document.getElementById('note-editor').classList.add('hidden');
    document.getElementById('empty-state').classList.remove('hidden');
    await loadNotes();
  } catch { document.getElementById('editor-error').textContent = 'Error al eliminar'; }
}

// --- UTILS ---
function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function formatDate(dt) {
  return new Date(dt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
