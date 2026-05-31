const API_BASE = "/api";

function getAuth() {
  const raw = localStorage.getItem("auth");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function requireAdmin() {
  const auth = getAuth();
  if (!auth || !auth.token || auth.user.rol !== "ADMIN") {
    window.location.href = "./dashboard.html";
    return null;
  }
  return auth;
}

function logout() {
  localStorage.removeItem("auth");
  window.location.href = "./login.html";
}

async function loadUsers() {
  const auth = requireAdmin();
  if (!auth) return;
  if (document.getElementById("btnLogout")) {
    document.getElementById("btnLogout").addEventListener("click", logout);
  }
  const table = document.getElementById("usersTable");
  const res = await fetch(`${API_BASE}/admin/users`, {
    headers: {
      Authorization: `Bearer ${auth.token}`,
    },
  });
  const data = await res.json();
  if (!res.ok) {
    table.innerHTML =
      "<tbody><tr><td>Error cargando usuarios</td></tr></tbody>";
    return;
  }
  const headers = [
    "id_usuario",
    "nombre_completo",
    "correo",
    "pais",
    "fecha_registro",
    "estado_cuenta",
    "rol",
  ];
  const rows = data.rows || [];
  table.innerHTML = `
    <thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead>
    <tbody>
      ${rows.map((r) => `<tr>${headers.map((h) => `<td>${r[h] ?? ""}</td>`).join("")}</tr>`).join("")}
    </tbody>`;
}

window.addEventListener("DOMContentLoaded", loadUsers);
