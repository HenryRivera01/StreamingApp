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

function formatRating(movie) {
  const count = Number(movie.rating_count || 0);
  const average = movie.rating_average;
  if (!count) {
    return "Sin calificaciones todavía";
  }
  return `${average} / 5 · ${count} voto${count === 1 ? "" : "s"}`;
}

function renderStars(container, currentValue, onSelect) {
  container.innerHTML = "";
  for (let rating = 1; rating <= 5; rating += 1) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `rating-star${rating <= currentValue ? " active" : ""}`;
    button.textContent = rating;
    button.dataset.rating = String(rating);
    button.addEventListener("click", () => onSelect(rating));
    container.appendChild(button);
  }
}

function captureThumbnail(video, previewImage) {
  return new Promise((resolve) => {
    const captureFrame = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth || 1280;
        canvas.height = video.videoHeight || 720;
        const context = canvas.getContext("2d");
        if (!context) {
          resolve(false);
          return;
        }
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        previewImage.src = canvas.toDataURL("image/jpeg", 0.88);
        previewImage.classList.add("is-ready");
        resolve(true);
      } catch (error) {
        resolve(false);
      }
    };

    const onSeeked = () => {
      captureFrame();
      video.currentTime = 0;
    };

    const onLoadedMetadata = () => {
      if (!Number.isFinite(video.duration) || video.duration <= 0) {
        resolve(false);
        return;
      }

      const targetTime = Math.min(1, Math.max(0.1, video.duration - 0.1));
      video.addEventListener("seeked", onSeeked, { once: true });
      try {
        video.currentTime = targetTime;
      } catch (error) {
        resolve(false);
      }
    };

    video.addEventListener("loadedmetadata", onLoadedMetadata, { once: true });
  });
}

async function submitRating(auth, type, id, puntuacion) {
  const res = await fetch(
    `${API_BASE}/media/${type === "movie" ? "movies" : "episodes"}/${id}/rating`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${auth.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ puntuacion }),
    },
  );

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Error guardando calificación");
  }

  return data;
}

async function initPlayer() {
  const auth = requireAuth();
  if (!auth) return;
  document.getElementById("btnLogout").addEventListener("click", logout);
  const params = new URLSearchParams(window.location.search);
  const type = params.get("type");
  const id = params.get("id");
  const video = document.getElementById("video");
  const titleEl = document.getElementById("playerTitle");
  const playerMeta = document.getElementById("playerMeta");
  const ratingSummary = document.getElementById("ratingSummary");
  const ratingControls = document.getElementById("ratingControls");
  const episodeControlsContainer = document.createElement("div");
  episodeControlsContainer.id = "episodeControls";
  episodeControlsContainer.style.marginTop = "12px";
  ratingControls.after(episodeControlsContainer);
  let currentMediaType = null;
  let currentMediaId = null;

  async function refreshRatingUI(media) {
    const currentRating = Number(media.user_rating || 0);
    ratingSummary.textContent = formatRating(media);

    renderStars(ratingControls, currentRating, async (rating) => {
      ratingSummary.textContent = "Guardando calificación...";
      const updated = await submitRating(
        auth,
        currentMediaType,
        currentMediaId,
        rating,
      );
      await refreshRatingUI(updated);
    });
  }

  async function loadMediaDetails(nextType, nextId) {
    const endpoint =
      nextType === "movie"
        ? `${API_BASE}/media/movies/${nextId}`
        : `${API_BASE}/media/episodes/${nextId}`;

    const res = await fetch(endpoint, {
      headers: { Authorization: `Bearer ${auth.token}` },
    });
    const media = await res.json();
    if (!res.ok) {
      throw new Error(media.message || "Error cargando contenido");
    }
    return media;
  }

  async function renderPlayer(nextType, nextId) {
    const media = await loadMediaDetails(nextType, nextId);

    titleEl.textContent = media.titulo || "Reproduciendo";
    playerMeta.textContent = [
      media.anio_estreno || media.anio_inicio_emision || "",
      media.duracion_minutos ? `${media.duracion_minutos} min` : "",
      media.clasificacion_edad || "",
    ]
      .filter(Boolean)
      .join(" · ");

    const poster =
      media.thumbnail_url &&
      (media.thumbnail_url.startsWith("/") ||
        media.thumbnail_url.startsWith("http"))
        ? media.thumbnail_url
        : "../assets/placeholder.png";
    const hero = document.getElementById("playerHero");
    if (hero) {
      hero.style.backgroundImage = `url(${poster})`;
    }
    const sinopsisEl = document.getElementById("playerSinopsis");
    if (sinopsisEl) sinopsisEl.textContent = media.sinopsis || "";

    currentMediaType = nextType;
    currentMediaId = nextId;
    await refreshRatingUI(media);

    // Si es episodio, cargar lista de episodios de la serie para permitir
    // navegación (prev/next, selector) y autoplay del siguiente
    if (nextType === "episode" && media.id_serie) {
      try {
        const res = await fetch(
          `${API_BASE}/media/series/${encodeURIComponent(media.id_serie)}/episodes`,
          {
            headers: { Authorization: `Bearer ${auth.token}` },
          },
        );
        const eps = await res.json();
        if (Array.isArray(eps)) {
          const idx = eps.findIndex(
            (e) => String(e.id_episodio) === String(nextId),
          );
          // Construir controles
          episodeControlsContainer.innerHTML = "";
          const prevBtn = document.createElement("button");
          prevBtn.type = "button";
          prevBtn.className = "btn";
          prevBtn.textContent = "Anterior";
          const nextBtn = document.createElement("button");
          nextBtn.type = "button";
          nextBtn.className = "btn primary";
          nextBtn.textContent = "Siguiente";

          const select = document.createElement("select");
          select.style.marginLeft = "12px";
          select.className = "input";
          eps.forEach((e, i) => {
            const opt = document.createElement("option");
            opt.value = e.id_episodio;
            opt.textContent = `S${e.id_temporada || ""}E${e.numero_episodio || i + 1} · ${e.titulo || ""}`;
            if (i === idx) opt.selected = true;
            select.appendChild(opt);
          });

          prevBtn.disabled = idx <= 0;
          nextBtn.disabled = idx < 0 || idx >= eps.length - 1;

          prevBtn.addEventListener("click", async () => {
            if (idx > 0) {
              const target = eps[idx - 1];
              window.location.href = `./player.html?type=episode&id=${encodeURIComponent(target.id_episodio)}`;
            }
          });
          nextBtn.addEventListener("click", async () => {
            if (idx >= 0 && idx < eps.length - 1) {
              const target = eps[idx + 1];
              window.location.href = `./player.html?type=episode&id=${encodeURIComponent(target.id_episodio)}`;
            }
          });

          select.addEventListener("change", (ev) => {
            const val = ev.target.value;
            if (val) {
              window.location.href = `./player.html?type=episode&id=${encodeURIComponent(val)}`;
            }
          });

          episodeControlsContainer.appendChild(prevBtn);
          episodeControlsContainer.appendChild(nextBtn);
          episodeControlsContainer.appendChild(select);

          // Autoplay siguiente cuando termine
          video.addEventListener(
            "ended",
            () => {
              const nextIndex = idx + 1;
              if (nextIndex >= 0 && nextIndex < eps.length) {
                const target = eps[nextIndex];
                window.location.href = `./player.html?type=episode&id=${encodeURIComponent(target.id_episodio)}`;
              }
            },
            { once: true },
          );
        }
      } catch (err) {
        console.warn("No se pudieron cargar episodios de la serie", err);
      }
    }

    return media;
  }

  if (type === "movie") {
    await renderPlayer("movie", id);
    video.src = `${API_BASE}/media/movies/${id}/stream?token=${encodeURIComponent(auth.token)}`;
  } else if (type === "episode") {
    await renderPlayer("episode", id);
    video.src = `${API_BASE}/media/episodes/${id}/stream?token=${encodeURIComponent(auth.token)}`;
  }

  // Nota: no se captura thumbnail dinámico aquí (usamos thumbnail_url o placeholder)
}

window.addEventListener("DOMContentLoaded", initPlayer);
