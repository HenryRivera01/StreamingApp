
const API_BASE = '/api';

function saveAuth(data) {
  localStorage.setItem('auth', JSON.stringify(data));
}

function getAuth() {
  const raw = localStorage.getItem('auth');
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

async function login() {
  const correo = document.getElementById('correo').value;
  const contrasena = document.getElementById('contrasena').value;
  const error = document.getElementById('error');
  error.textContent = '';
  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ correo, contrasena }),
    });
    const data = await res.json();
    if (!res.ok) {
      error.textContent = data.message || 'Error en login';
      return;
    }
    saveAuth(data);
    window.location.href = './dashboard.html';
  } catch (e) {
    error.textContent = 'No se pudo conectar con el servidor';
  }
}

async function register() {
  const nombre_completo = document.getElementById('nombre').value;
  const correo = document.getElementById('correo').value;
  const pais = document.getElementById('pais').value;
  const contrasena = document.getElementById('contrasena').value;
  const error = document.getElementById('error');
  error.textContent = '';
  try {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre_completo, correo, contrasena, pais }),
    });
    const data = await res.json();
    if (!res.ok) {
      error.textContent = data.message || 'Error en registro';
      return;
    }
    saveAuth(data);
    window.location.href = './dashboard.html';
  } catch (e) {
    error.textContent = 'No se pudo conectar con el servidor';
  }
}

if (document.getElementById('btnLogin')) {
  document.getElementById('btnLogin').addEventListener('click', login);
}

if (document.getElementById('btnRegister')) {
  document.getElementById('btnRegister').addEventListener('click', register);
}
