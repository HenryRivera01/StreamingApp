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

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function formatRating(item) {
  const count = Number(item.rating_count || 0);
  const average = item.rating_average;
  if (!count) {
    return "Sin rating";
  }
  return `${average} / 5 · ${count} voto${count === 1 ? "" : "s"}`;
}

function createCard(item, type) {
  const card = document.createElement("article");
  card.className = "card-media";
  const poster = item.thumbnail_url || "../assets/placeholder.png";
  const rating = formatRating(item);
  card.innerHTML = `
    <img src="${poster}" alt="${item.titulo || "Contenido"}" />
    <div class="card-media-overlay">
      <div class="card-media-title">${item.titulo || "Sin título"}</div>
      <div class="card-media-meta">${type === "movie" ? item.anio_estreno || "" : item.anio_inicio_emision || ""}</div>
      <div class="card-media-meta">${rating}</div>
    </div>`;
  card.addEventListener("click", () => {
    const params = new URLSearchParams({
      type,
      id: type === "movie" ? item.id_pelicula : item.id_serie,
    });
    window.location.href = `./player.html?${params.toString()}`;
  });
  return card;
}

async function loadDashboard() {
  const auth = requireAuth();
  if (!auth) return;

  const userEmail = document.getElementById("userEmail");
  if (userEmail) {
    userEmail.textContent = auth.user.correo;
  }

  if (auth.user.rol === "ADMIN") {
    const linkAdmin = document.getElementById("linkAdmin");
    if (linkAdmin) linkAdmin.style.display = "block";
  }

  const logoutButton = document.getElementById("btnLogout");
  if (logoutButton) {
    logoutButton.addEventListener("click", logout);
  }

  const rowsContainer = document.getElementById("rows");
  const searchInput = document.getElementById("catalogSearch");
  const headers = { Authorization: `Bearer ${auth.token}` };
  const [moviesRes, seriesRes] = await Promise.all([
    fetch(`${API_BASE}/media/movies`, { headers }),
    fetch(`${API_BASE}/media/series`, { headers }),
  ]);

  const movies = await moviesRes.json();
  const series = await seriesRes.json();
  const pageSize = 10;
  const state = {
    query: "",
    moviePage: 0,
    seriesPage: 0,
  };

  function filterItems(items) {
    if (!state.query) {
      return items;
    }

    return items.filter((item) =>
      normalizeText(item.titulo).includes(state.query),
    );
  }

  function clampPage(page, total) {
    if (total <= pageSize) return 0;
    const maxPage = Math.max(0, Math.ceil(total / pageSize) - 1);
    return Math.min(Math.max(page, 0), maxPage);
  }

  function createRow(title, items, type, pageKey) {
    const section = document.createElement("section");
    section.className = "catalog-row";

    const currentPage = clampPage(state[pageKey], items.length);
    state[pageKey] = currentPage;
    const start = currentPage * pageSize;
    const end = start + pageSize;
    const visibleItems = items.slice(start, end);
    const maxPage = items.length ? Math.ceil(items.length / pageSize) - 1 : 0;

    section.innerHTML = `
      <div class="catalog-toolbar">
        <div>
          <h2>${title}</h2>
          <div class="card-media-meta">${items.length} resultado${items.length === 1 ? "" : "s"}</div>
        </div>
        <div class="carousel-controls">
          <button type="button" class="carousel-button" data-carousel-prev aria-label="Anterior">‹</button>
          <button type="button" class="carousel-button" data-carousel-next aria-label="Siguiente">›</button>
        </div>
      </div>`;

    const scroller = document.createElement("div");
    scroller.className = "horizontal-scroll carousel-shell";
    visibleItems.forEach((item) => {
      scroller.appendChild(createCard(item, type));
    });

    if (!visibleItems.length) {
      const empty = document.createElement("div");
      empty.className = "panel";
      empty.textContent = "No hay resultados para esta búsqueda.";
      scroller.appendChild(empty);
    }

    section.appendChild(scroller);
    rowsContainer.appendChild(section);

    const prevButton = section.querySelector("[data-carousel-prev]");
    const nextButton = section.querySelector("[data-carousel-next]");

    const hasPrev = currentPage > 0;
    const hasNext = currentPage < maxPage;

    prevButton.disabled = !hasPrev;
    nextButton.disabled = !hasNext;

    prevButton.addEventListener("click", () => {
      state[pageKey] = Math.max(0, state[pageKey] - 1);
      render();
    });

    nextButton.addEventListener("click", () => {
      state[pageKey] = Math.min(maxPage, state[pageKey] + 1);
      render();
    });
  }

  function render() {
    rowsContainer.innerHTML = "";
    const filteredMovies = filterItems(Array.isArray(movies) ? movies : []);
    const filteredSeries = filterItems(Array.isArray(series) ? series : []);

    if (!filteredMovies.length && !filteredSeries.length) {
      const emptyState = document.createElement("section");
      emptyState.className = "panel";
      emptyState.textContent =
        "No encontramos películas ni series con ese nombre.";
      rowsContainer.appendChild(emptyState);
      return;
    }

    if (filteredMovies.length) {
      createRow("Películas", filteredMovies, "movie", "moviePage");
    }

    if (filteredSeries.length) {
      createRow("Series", filteredSeries, "series", "seriesPage");
    }
  }

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      state.query = normalizeText(searchInput.value.trim());
      state.moviePage = 0;
      state.seriesPage = 0;
      render();
    });
  }

  render();
}

window.addEventListener("DOMContentLoaded", loadDashboard);
