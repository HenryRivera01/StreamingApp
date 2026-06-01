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

function formatDate(value) {
  if (!value) return "Sin fecha";
  if (typeof value === "string") return value;
  if (value instanceof Date)
    return value.toISOString().slice(0, 19).replace("T", " ");
  if (typeof value === "object") {
    if (
      typeof value.toString === "function" &&
      value.toString !== Object.prototype.toString
    ) {
      return value.toString();
    }
    if (
      typeof value.year === "number" &&
      typeof value.month === "number" &&
      typeof value.day === "number"
    ) {
      return `${String(value.year).padStart(4, "0")}-${String(value.month).padStart(2, "0")}-${String(value.day).padStart(2, "0")}`;
    }
  }
  return String(value);
}

function statCard(label, value, hint = "") {
  return `
    <article class="stat-card">
      <span class="stat-label">${label}</span>
      <strong class="stat-value">${value}</strong>
      ${hint ? `<span class="stat-hint">${hint}</span>` : ""}
    </article>
  `;
}

function listItem(text) {
  return `<li class="list-item">${text}</li>`;
}

async function loadAdminDashboard() {
  const auth = requireAdmin();
  if (!auth) return;

  if (document.getElementById("btnLogout")) {
    document.getElementById("btnLogout").addEventListener("click", logout);
  }

  const container = document.getElementById("adminDashboard");
  if (!container) return;

  try {
    const res = await fetch(`${API_BASE}/admin/dashboard`, {
      headers: { Authorization: `Bearer ${auth.token}` },
    });
    const data = await res.json();
    if (!res.ok) {
      container.innerHTML =
        '<div class="panel"><p>Error cargando dashboard admin</p></div>';
      return;
    }

    const totalViews = Number(data.total_historial || 0);
    const topMovie = (data.mas_visto_peliculas || [])[0];
    const topEpisode = (data.mas_visto_episodios || [])[0];
    const topUser = (data.usuarios_mas_activos || [])[0];

    container.innerHTML = `
      <div class="panel admin-kpis">
        <h3>Métricas generales</h3>
        <div class="stats-grid">
          ${statCard("Usuarios", data.total_usuarios, "Cuentas registradas")}
          ${statCard("Películas", data.total_peliculas, "Catálogo de películas")}
          ${statCard("Series", data.total_series, "Series activas")}
          ${statCard("Reproducciones", totalViews, "Entradas en historial")}
        </div>
      </div>
      <div class="panel">
        <h3>Contenido más visto</h3>
        <div class="summary-columns">
          <div>
            <p class="chip">Películas</p>
            <ul class="list-compact">
              ${
                (data.mas_visto_peliculas || [])
                  .map((p, index) =>
                    listItem(
                      `${index + 1}. ${p.titulo} · ${p.reproducciones} reproducciones`,
                    ),
                  )
                  .join("") || listItem("Sin datos")
              }
            </ul>
          </div>
          <div>
            <p class="chip">Episodios</p>
            <ul class="list-compact">
              ${
                (data.mas_visto_episodios || [])
                  .map((e, index) =>
                    listItem(
                      `${index + 1}. ${e.titulo} · ${e.reproducciones} reproducciones`,
                    ),
                  )
                  .join("") || listItem("Sin datos")
              }
            </ul>
          </div>
        </div>
      </div>
      <div class="panel">
        <h3>Usuarios más activos</h3>
        <ul class="list-compact">
          ${
            (data.usuarios_mas_activos || [])
              .map((u, index) =>
                listItem(
                  `${index + 1}. ${u.correo || u.id_usuario || "Usuario"} · ${u.total_repros || 0} reproducciones`,
                ),
              )
              .join("") || listItem("Sin datos")
          }
        </ul>
        ${topUser ? `<p class="help-text">Más activo: ${topUser.correo || topUser.id_usuario} con ${topUser.total_repros} reproducciones.</p>` : ""}
        ${topMovie ? `<p class="help-text">Película líder: ${topMovie.titulo}.</p>` : ""}
        ${topEpisode ? `<p class="help-text">Episodio líder: ${topEpisode.titulo}.</p>` : ""}
      </div>
      <div class="panel" style="grid-column:1 / -1;">
        <h3>Actividad reciente</h3>
        <table class="table">
          <thead>
            <tr>
              <th>Contenido</th>
              <th>Usuario</th>
              <th>Fecha</th>
              <th>Tiempo (min)</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            ${
              (data.actividad_reciente || [])
                .map(
                  (a) => `
              <tr>
                <td>${a.contenido_tipo || ""}${a.contenido_titulo ? ` · ${a.contenido_titulo}` : ""}</td>
                <td>${a.correo || ""}</td>
                <td>${formatDate(a.fecha_reproduccion)}</td>
                <td>${a.tiempo_reproducido || ""}</td>
                <td>${a.tipo_estado || ""}</td>
              </tr>`,
                )
                .join("") ||
              `
              <tr>
                <td colspan="5">Sin actividad reciente</td>
              </tr>`
            }
          </tbody>
        </table>
      </div>
    `;
  } catch (err) {
    console.error(err);
    container.innerHTML =
      '<div class="panel"><p>Error de red cargando dashboard admin</p></div>';
  }
}

// Cargar distribuidores, géneros y series para los formularios
async function loadUploadFormOptions() {
  const auth = getAuth();
  if (!auth || !auth.token || auth.user.rol !== "ADMIN") return;

  let res;
  try {
    res = await fetch(`${API_BASE}/media/upload-form-data`, {
      headers: { Authorization: `Bearer ${auth.token}` },
    });
  } catch (err) {
    console.error(err);
    return;
  }

  const data = await res.json();
  if (!res.ok) {
    console.error("Error cargando catálogos de upload", data);
    return;
  }

  const distSelect = document.getElementById("distribuidorSelect");
  const generosSelect = document.getElementById("generosSelect");
  const generoPrincipalSelect = document.getElementById("generoPrincipal");
  const serieSelect = document.getElementById("serieSelect");
  const generosSeriesSelect = document.getElementById("generosSeriesSelect");
  const generoPrincipalSerieSelect = document.getElementById(
    "generoPrincipalSerie",
  );

  if (distSelect && data.distribuidores) {
    data.distribuidores.forEach((d) => {
      const opt = document.createElement("option");
      opt.value = d.id_distribuidor;
      opt.textContent = d.nombre;
      distSelect.appendChild(opt);
    });
  }

  if (generosSelect && generoPrincipalSelect && data.generos) {
    data.generos.forEach((g) => {
      const opt = document.createElement("option");
      opt.value = g.id_genero;
      opt.textContent = g.nombre_genero;
      generosSelect.appendChild(opt);

      const opt2 = opt.cloneNode(true);
      generoPrincipalSelect.appendChild(opt2);
    });
  }

  if (serieSelect && data.series) {
    data.series.forEach((s) => {
      const opt = document.createElement("option");
      opt.value = s.id_serie;
      opt.textContent = s.titulo;
      serieSelect.appendChild(opt);
    });
  }

  if (generosSeriesSelect && generoPrincipalSerieSelect && data.generos) {
    data.generos.forEach((g) => {
      const opt = document.createElement("option");
      opt.value = g.id_genero;
      opt.textContent = g.nombre_genero;
      generosSeriesSelect.appendChild(opt);

      const opt2 = opt.cloneNode(true);
      generoPrincipalSerieSelect.appendChild(opt2);
    });
  }
}

// Subida de películas
function initUploadForm() {
  const auth = getAuth();
  if (!auth || !auth.token || auth.user.rol !== "ADMIN") return;

  const form = document.getElementById("uploadForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = document.getElementById("uploadMsg");
    msg.textContent = "Subiendo...";
    msg.classList.remove("status-error", "status-success");

    const formData = new FormData();

    formData.append("titulo", document.getElementById("titulo").value);
    formData.append("anio", document.getElementById("anio").value);
    formData.append("sinopsis", document.getElementById("sinopsis").value);
    formData.append(
      "duracion_minutos",
      document.getElementById("duracionMinutosMovie").value,
    );
    formData.append(
      "clasificacion",
      document.getElementById("clasificacion").value,
    );
    formData.append("idioma", document.getElementById("idioma").value);

    const distSelect = document.getElementById("distribuidorSelect");
    const distNuevo = document.getElementById("distribuidorNuevo").value;
    if (distSelect && distSelect.value) {
      formData.append("distribuidor_id", distSelect.value);
    }
    if (distNuevo) {
      formData.append("distribuidor_nuevo", distNuevo);
    }

    const generosSelect = document.getElementById("generosSelect");
    if (generosSelect) {
      const selectedGeneros = Array.from(generosSelect.selectedOptions).map(
        (o) => o.value,
      );
      if (selectedGeneros.length) {
        formData.append("generos_ids", selectedGeneros.join(","));
      }
    }

    const generoPrincipal = document.getElementById("generoPrincipal").value;
    if (generoPrincipal) {
      formData.append("genero_principal_id", generoPrincipal);
    }

    formData.append(
      "participantes_text",
      document.getElementById("participantes").value,
    );

    const fileInput = document.getElementById("file");
    if (!fileInput || fileInput.files.length === 0) {
      msg.textContent = "Selecciona un archivo .mp4";
      msg.classList.add("status-error");
      return;
    }
    // Validar extensiones permitidas (mp4, mkv, webm)
    const allowedExt = [".mp4", ".mkv", ".webm"];
    const fileName = fileInput.files[0].name || "";
    const ext = fileName.slice(fileName.lastIndexOf(".")).toLowerCase();
    if (!allowedExt.includes(ext)) {
      msg.textContent = "Extensión no permitida. Usa mp4, mkv o webm.";
      msg.classList.add("status-error");
      return;
    }
    // Validaciones numéricas mínimas
    const anioVal = Number(document.getElementById("anio").value);
    if (
      document.getElementById("anio").value &&
      (!Number.isInteger(anioVal) || anioVal < 1888)
    ) {
      msg.textContent = "Año inválido (>= 1888).";
      msg.classList.add("status-error");
      return;
    }
    const durVal = Number(
      document.getElementById("duracionMinutosMovie").value,
    );
    if (
      document.getElementById("duracionMinutosMovie").value &&
      (!Number.isFinite(durVal) || durVal <= 0)
    ) {
      msg.textContent = "Duración inválida (debe ser mayor que 0).";
      msg.classList.add("status-error");
      return;
    }

    formData.append("file", fileInput.files[0]);

    try {
      const res = await fetch(`${API_BASE}/media/upload-movie`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${auth.token}`,
        },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        msg.textContent = data.message || "Error subiendo película";
        msg.classList.add("status-error");
        return;
      }
      msg.textContent = "Película subida con toda la metadata";
      msg.classList.add("status-success");
      form.reset();
      loadAdminDashboard();
      loadUploadFormOptions();
    } catch (err) {
      console.error(err);
      msg.textContent = "Error de red";
      msg.classList.add("status-error");
    }
  });
}

// Subida de episodios de series
function initUploadSeriesForm() {
  const auth = getAuth();
  if (!auth || !auth.token || auth.user.rol !== "ADMIN") return;

  const form = document.getElementById("uploadSeriesForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = document.getElementById("uploadSeriesMsg");
    msg.textContent = "Subiendo episodio...";
    msg.classList.remove("status-error", "status-success");

    const fd = new FormData();

    // Serie
    fd.append("serie_id", document.getElementById("serieSelect").value);
    fd.append("serie_titulo", document.getElementById("serieTitulo").value);
    fd.append("serie_sinopsis", document.getElementById("serieSinopsis").value);
    fd.append("serie_anio_inicio", document.getElementById("serieAnio").value);
    fd.append(
      "serie_numero_temporadas",
      document.getElementById("serieNumeroTemporadas").value,
    );
    fd.append(
      "serie_clasificacion",
      document.getElementById("serieClasificacion").value,
    );
    fd.append("serie_estado", document.getElementById("serieEstado").value);

    // Temporada
    fd.append(
      "numero_temporada",
      document.getElementById("numeroTemporada").value,
    );
    fd.append(
      "anio_lanzamiento_temp",
      document.getElementById("anioTemp").value,
    );

    // Episodio
    fd.append(
      "episodio_titulo",
      document.getElementById("episodioTitulo").value,
    );
    fd.append(
      "numero_episodio",
      document.getElementById("numeroEpisodio").value,
    );
    fd.append(
      "duracion_minutos",
      document.getElementById("duracionMinutos").value,
    );
    fd.append(
      "episodio_sinopsis",
      document.getElementById("episodioSinopsis").value,
    );

    // Distribuidor (reutiliza los campos de película)
    const distSelect = document.getElementById("distribuidorSelect");
    const distNuevo = document.getElementById("distribuidorNuevo").value;
    if (distSelect && distSelect.value) {
      fd.append("distribuidor_id", distSelect.value);
    }
    if (distNuevo) {
      fd.append("distribuidor_nuevo", distNuevo);
    }

    // Géneros
    const generosSeriesSelect = document.getElementById("generosSeriesSelect");
    if (generosSeriesSelect) {
      const selectedG = Array.from(generosSeriesSelect.selectedOptions).map(
        (o) => o.value,
      );
      if (selectedG.length) {
        fd.append("generos_ids", selectedG.join(","));
      }
    }

    const generoPrincipalSerie = document.getElementById(
      "generoPrincipalSerie",
    ).value;
    if (generoPrincipalSerie) {
      fd.append("genero_principal_id", generoPrincipalSerie);
    }

    // Participantes
    fd.append(
      "participantes_text",
      document.getElementById("participantesSerie").value,
    );

    // Archivo
    const fileInput = document.getElementById("fileSerie");
    if (!fileInput || !fileInput.files.length) {
      msg.textContent = "Selecciona un archivo .mp4";
      msg.classList.add("status-error");
      return;
    }
    // Validar extensiones permitidas (mp4, mkv, webm)
    const allowedExtS = [".mp4", ".mkv", ".webm"];
    const fileNameS = fileInput.files[0].name || "";
    const extS = fileNameS.slice(fileNameS.lastIndexOf(".")).toLowerCase();
    if (!allowedExtS.includes(extS)) {
      msg.textContent = "Extensión no permitida. Usa mp4, mkv o webm.";
      msg.classList.add("status-error");
      return;
    }
    // Validar numericos mínimos
    const numTemp = Number(document.getElementById("numeroTemporada").value);
    if (
      document.getElementById("numeroTemporada").value &&
      (!Number.isInteger(numTemp) || numTemp <= 0)
    ) {
      msg.textContent = "Número de temporada inválido.";
      msg.classList.add("status-error");
      return;
    }
    const numEpi = Number(document.getElementById("numeroEpisodio").value);
    if (
      document.getElementById("numeroEpisodio").value &&
      (!Number.isInteger(numEpi) || numEpi <= 0)
    ) {
      msg.textContent = "Número de episodio inválido.";
      msg.classList.add("status-error");
      return;
    }
    const durE = Number(document.getElementById("duracionMinutos").value);
    if (
      document.getElementById("duracionMinutos").value &&
      (!Number.isFinite(durE) || durE <= 0)
    ) {
      msg.textContent = "Duración inválida (debe ser mayor que 0).";
      msg.classList.add("status-error");
      return;
    }

    fd.append("file", fileInput.files[0]);

    try {
      const res = await fetch(`${API_BASE}/media/upload-series-episode`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${auth.token}`,
        },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        msg.textContent = data.message || "Error subiendo episodio";
        msg.classList.add("status-error");
        return;
      }
      msg.textContent = "Episodio subido correctamente";
      msg.classList.add("status-success");
      form.reset();
      loadAdminDashboard();
      loadUploadFormOptions();
    } catch (err) {
      console.error(err);
      msg.textContent = "Error de red";
      msg.classList.add("status-error");
    }
  });
}

window.addEventListener("DOMContentLoaded", () => {
  loadAdminDashboard();
  loadUploadFormOptions();
  initUploadForm();
  initUploadSeriesForm();
});
//window.addEventListener('DOMContentLoaded', loadAdminDashboard);
