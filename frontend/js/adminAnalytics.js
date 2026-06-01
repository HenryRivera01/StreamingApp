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

async function runQuery() {
  const auth = requireAdmin();
  if (!auth) return;
  const resDiv = document.getElementById("results");
  resDiv.textContent = "Ejecutando...";
  try {
    const res = await fetch(`${API_BASE}/admin/advanced-queries`, {
      headers: {
        Authorization: `Bearer ${auth.token}`,
      },
    });
    const data = await res.json();
    if (!res.ok) {
      resDiv.textContent = data.message || "Error en consulta";
      return;
    }
    const content = data.contenido_por_genero || [];
    const duration = data.duracion_peliculas || {};
    const activeUsers = data.usuarios_mas_activos || [];
    const withoutViews = data.peliculas_sin_reproducciones || [];

    resDiv.innerHTML = `
      <div class="panel" style="margin-bottom:12px;">
        <h3>Contenido por género</h3>
        <table class="table">
          <thead><tr><th>Género</th><th>Total</th></tr></thead>
          <tbody>
            ${content.map((row) => `<tr><td>${row.nombre_genero ?? ""}</td><td>${row.total ?? ""}</td></tr>`).join("") || '<tr><td colspan="2">Sin datos</td></tr>'}
          </tbody>
        </table>
      </div>
      <div class="panel" style="margin-bottom:12px;">
        <h3>Duración de películas</h3>
        <p>Promedio: ${duration.promedio_peliculas ?? "n/d"} | Máxima: ${duration.max_pelicula ?? "n/d"} | Mínima: ${duration.min_pelicula ?? "n/d"}</p>
      </div>
      <div class="panel" style="margin-bottom:12px;">
        <h3>Películas sin reproducciones</h3>
        <ul class="list-compact">
          ${withoutViews.map((row) => `<li class="list-item">${row.titulo ?? "Sin título"}</li>`).join("") || '<li class="list-item">Sin datos</li>'}
        </ul>
      </div>
      <div class="panel">
        <h3>Usuarios más activos</h3>
        <table class="table">
          <thead><tr><th>Usuario</th><th>Correo</th><th>Reproducciones</th></tr></thead>
          <tbody>
            ${activeUsers.map((row) => `<tr><td>${row.id_usuario ?? ""}</td><td>${row.correo ?? ""}</td><td>${row.total_repros ?? ""}</td></tr>`).join("") || '<tr><td colspan="3">Sin datos</td></tr>'}
          </tbody>
        </table>
      </div>
    `;
  } catch (e) {
    resDiv.textContent = "Error de red";
  }
}

function initAnalytics() {
  const auth = requireAdmin();
  if (!auth) return;
  if (document.getElementById("btnLogout")) {
    document.getElementById("btnLogout").addEventListener("click", logout);
  }
  const btnRun = document.getElementById("btnRun");
  if (btnRun) {
    btnRun.addEventListener("click", runQuery);
    runQuery();
  }
}

window.addEventListener("DOMContentLoaded", initAnalytics);
