# Notas Privadas

Aplicación web de gestión de notas privadas por usuario. Cada usuario solo puede ver y editar sus propias notas.

## Requisitos

- [Node.js](https://nodejs.org) instalado (o versión portable)
- No requiere base de datos externa — los datos se guardan en `backend/data.json`

---

## Opción A: Con Docker

Desde la carpeta `mi-proyecto`:

```bash
docker compose up --build
```

Abre `http://localhost:8080` en el navegador.

---

## Opción B: Sin Docker (Node.js)

### 1. Instalar dependencias

```bash
cd backend
npm install
```

Si Node no está en el PATH (versión portable):

```powershell
& "C:\ruta\a\node\npm.cmd" install
```

### 2. Arrancar el servidor

```bash
node app.js
```

Con Node portable:

```powershell
& "C:\ruta\a\node\node.exe" app.js
```

### 3. Abrir la app

Abre `http://localhost:3000` en el navegador.

---

## Primer uso

1. Haz clic en **Registrarse** y crea tu cuenta con email y contraseña (mín. 6 caracteres).
2. A partir de ahí usa **Iniciar sesión** con esas mismas credenciales.
3. Los datos persisten en `backend/data.json` aunque reinicies el servidor.

---

## Estructura del proyecto

```
mi-proyecto/
├── backend/
│   ├── app.js          # Servidor Express (API REST)
│   ├── package.json
│   ├── Dockerfile
│   └── data.json       # Base de datos (se crea automáticamente)
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── script.js
└── docker-compose.yml
```
