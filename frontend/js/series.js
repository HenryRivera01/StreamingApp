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

function requireAuth() {
  const auth = getAuth();
  if (!auth || !auth.token) {
    window.location.href = "./login.html";
    return null;
  }
  return auth;
}

function logout() {
  localStorage.removeItem("auth");
  window.location.href = "./login.html";
}

function createEpisodeCard(ep) {
  const article = document.createElement("article");
  article.className = "card-media";
  const poster = ep.thumbnail_url || "../assets/placeholder.png";
  article.innerHTML = `
    <img src="${poster}" alt="${ep.titulo || "Episodio"}" />
    <div class="card-media-overlay">
      <div class="card-media-title">${ep.numero_episodio ? `E${ep.numero_episodio} · ` : ""}${ep.titulo || "Sin título"}</div>
      <div class="card-media-meta">${ep.duracion_minutos ? ep.duracion_minutos + " min" : ""}</div>
      ${ep.sinopsis ? `<p class="card-sinopsis">${ep.sinopsis.length > 140 ? ep.sinopsis.slice(0, 137) + "…" : ep.sinopsis}</p>` : ""}
    </div>`;

  article.addEventListener("click", () => {
    window.location.href = `./player.html?type=episode&id=${encodeURIComponent(ep.id_episodio)}`;
  });
  return article;
}

async function loadSeriesPage() {
  const auth = requireAuth();
  if (!auth) return;
  document.getElementById("btnLogout").addEventListener("click", logout);

  const params = new URLSearchParams(window.location.search);
  const seriesId = params.get("id");
  if (!seriesId) {
    document.getElementById("seriesTitle").textContent =
      "Serie no especificada";
    return;
  }

  const headers = { Authorization: `Bearer ${auth.token}` };

  // Fetch series basic info from list (no single-series endpoint available)
  const [seriesRes, epsRes] = await Promise.all([
    fetch(`${API_BASE}/media/series`, { headers }),
    fetch(`${API_BASE}/media/series/${encodeURIComponent(seriesId)}/episodes`, {
      headers,
    }),
  ]);

  const seriesList = await seriesRes.json();
  const episodes = await epsRes.json();

  const series = Array.isArray(seriesList)
    ? seriesList.find((s) => String(s.id_serie) === String(seriesId))
    : null;
  document.getElementById("seriesTitle").textContent = series
    ? series.titulo
    : "Serie";
  const sinEl = document.getElementById("seriesSinopsis");
  if (sinEl) sinEl.textContent = series ? series.sinopsis || "" : "";
  const hero = document.getElementById("seriesHero");
  const poster =
    series &&
    series.thumbnail_url &&
    (series.thumbnail_url.startsWith("/") ||
      series.thumbnail_url.startsWith("http"))
      ? series.thumbnail_url
      : "../assets/placeholder.png";
  if (hero) hero.style.backgroundImage = `url(${poster})`;

  // Group episodes by season id preserving order
  const seasonsOrder = [];
  const episodesBySeason = {};
  (Array.isArray(episodes) ? episodes : []).forEach((ep) => {
    const seasonId = ep.id_temporada || "s0";
    if (!episodesBySeason[seasonId]) {
      episodesBySeason[seasonId] = [];
      seasonsOrder.push(seasonId);
    }
    episodesBySeason[seasonId].push(ep);
  });

  const seasonSelect = document.getElementById("seasonSelect");
  seasonSelect.innerHTML = "";
  seasonsOrder.forEach((sid, idx) => {
    const opt = document.createElement("option");
    opt.value = sid;
    opt.textContent = `Temporada ${idx + 1}`;
    seasonSelect.appendChild(opt);
  });

  function renderEpisodesForSeason(sid) {
    const container = document.getElementById("episodesList");
    container.innerHTML = "";
    const list = episodesBySeason[sid] || [];
    if (!list.length) {
      const panel = document.createElement("div");
      panel.className = "panel";
      panel.textContent = "No hay episodios disponibles.";
      container.appendChild(panel);
      return;
    }
    // Grid of episode cards
    list.forEach((ep) => container.appendChild(createEpisodeCard(ep)));
  }

  seasonSelect.addEventListener("change", () =>
    renderEpisodesForSeason(seasonSelect.value),
  );

  if (seasonsOrder.length) {
    renderEpisodesForSeason(seasonsOrder[0]);
  } else {
    document.getElementById("episodesList").innerHTML =
      '<div class="panel">No hay episodios demo.</div>';
  }
}

window.addEventListener("DOMContentLoaded", loadSeriesPage);
