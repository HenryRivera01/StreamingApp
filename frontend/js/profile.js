
function getAuth() {
  const raw = localStorage.getItem('auth');
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

function requireAuth() {
  const auth = getAuth();
  if (!auth || !auth.token) {
    window.location.href = './login.html';
    return null;
  }
  return auth;
}

function logout() {
  localStorage.removeItem('auth');
  window.location.href = './login.html';
}

function initProfile() {
  const auth = requireAuth();
  if (!auth) return;
  const info = document.getElementById('profileInfo');
  info.textContent = `${auth.user.nombre_completo || ''} (${auth.user.correo}) - Rol: ${auth.user.rol}`;
  if (document.getElementById('btnLogout')) {
    document.getElementById('btnLogout').addEventListener('click', logout);
  }
}

window.addEventListener('DOMContentLoaded', initProfile);
