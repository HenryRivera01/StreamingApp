const pool = require("../config/db");
const { runCypher } = require("../config/neo4j");
const fs = require("fs");
const path = require("path");
const { isNeo4jMediaEnabled } = require("../config/migrationFlags");

function roundToOneDecimal(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) {
    return null;
  }

  return Math.round(numberValue * 10) / 10;
}

async function getNextCalificacionId() {
  const rows = await runCypher(
    `
      MATCH (c:Calificacion)
      RETURN coalesce(max(c.id_calificacion), 0) + 1 AS next_id
    `,
  );

  return rows[0]?.next_id || 1;
}

function buildMediaProjection(alias, extraFields = {}) {
  return `${alias} { .* , ${Object.entries(extraFields)
    .map(([key, value]) => `${key}: ${value}`)
    .join(", ")} }`;
}

async function getAllMovies() {
  if (isNeo4jMediaEnabled()) {
    const rows = await runCypher(
      `
      MATCH (p:Pelicula)
      OPTIONAL MATCH (p)-[:DISTRIBUIDA_POR]->(d:Distribuidor)
      OPTIONAL MATCH (p)<-[:CALIFICO]-(rating:Calificacion)
      WITH p, d, avg(rating.puntuacion) AS ratingAverage, count(rating) AS ratingCount
      RETURN p {
        .* ,
        id_pelicula: p.id_pelicula,
        id_distribuidor: p.id_distribuidor,
        titulo: p.titulo,
        sinopsis: p.sinopsis,
        anio_estreno: p.anio_estreno,
        duracion_minutos: p.duracion_minutos,
        clasificacion_edad: p.clasificacion_edad,
        idioma_original: p.idioma_original,
        url_video: p.url_video,
        thumbnail_url: coalesce(p.thumbnail_url, p.poster_url),
        distribuidor: d.nombre,
        rating_average: round(coalesce(ratingAverage, 0) * 10) / 10.0,
        rating_count: ratingCount
      } AS movie
      ORDER BY p.titulo
      `,
    );

    // Si Neo4j no provee thumbnail_url (seed demo), intentar inferir desde
    // frontend/assets/thumbnails buscando archivos con prefijo pelicula_{id}_
    const thumbsDir = path.join(
      __dirname,
      "..",
      "..",
      "frontend",
      "assets",
      "thumbnails",
    );

    return rows.map((r) => {
      const movie = r.movie;
      if (!movie.thumbnail_url) {
        try {
          if (fs.existsSync(thumbsDir)) {
            const files = fs.readdirSync(thumbsDir);
            const match = files.find((f) =>
              f.startsWith(`pelicula_${movie.id_pelicula}_`),
            );
            if (match) movie.thumbnail_url = `/assets/thumbnails/${match}`;
          }
        } catch (e) {
          // ignore filesystem errors
        }
      }
      return movie;
    });
  }

  const { rows } = await pool.query(
    `SELECT p.*, d.nombre AS distribuidor
     FROM pelicula p
     LEFT JOIN distribuidor d ON p.id_distribuidor = d.id_distribuidor`,
  );
  // Para la rama SQL, si no hay thumbnail_url en la fila, intentar inferir un archivo existente
  const thumbsDir = path.join(
    __dirname,
    "..",
    "..",
    "frontend",
    "assets",
    "thumbnails",
  );
  return rows.map((r) => {
    const out = { ...r };
    if (!out.thumbnail_url) {
      try {
        if (fs.existsSync(thumbsDir)) {
          const files = fs.readdirSync(thumbsDir);
          const match = files.find((f) =>
            f.startsWith(`pelicula_${out.id_pelicula}_`),
          );
          if (match) out.thumbnail_url = `/assets/thumbnails/${match}`;
        }
      } catch (e) {
        // ignore filesystem errors
      }
    }
    return out;
  });
}

async function getAllSeries() {
  if (isNeo4jMediaEnabled()) {
    const rows = await runCypher(
      `
      MATCH (s:Serie)
      OPTIONAL MATCH (s)-[:DISTRIBUIDA_POR]->(d:Distribuidor)
      RETURN s {
        .* ,
        id_serie: s.id_serie,
        id_distribuidor: s.id_distribuidor,
        titulo: s.titulo,
        sinopsis: s.sinopsis,
        anio_inicio_emision: s.anio_inicio_emision,
        numero_temporadas: s.numero_temporadas,
        clasificacion_edad: s.clasificacion_edad,
        estado_serie: s.estado_serie,
        distribuidor: d.nombre
      } AS serie
      ORDER BY s.titulo
      `,
    );

    return rows.map((r) => r.serie);
  }

  const { rows } = await pool.query(
    `SELECT s.*, d.nombre AS distribuidor
     FROM serie s
     LEFT JOIN distribuidor d ON s.id_distribuidor = d.id_distribuidor`,
  );
  return rows;
}

async function getMovieById(id) {
  if (isNeo4jMediaEnabled()) {
    const rows = await runCypher(
      `
      MATCH (p:Pelicula {id_pelicula: $id})
      OPTIONAL MATCH (p)<-[:CALIFICO]-(rating:Calificacion)
      WITH p, avg(rating.puntuacion) AS ratingAverage, count(rating) AS ratingCount
      RETURN p {
        .* ,
        id_pelicula: p.id_pelicula,
        id_distribuidor: p.id_distribuidor,
        titulo: p.titulo,
        sinopsis: p.sinopsis,
        anio_estreno: p.anio_estreno,
        duracion_minutos: p.duracion_minutos,
        clasificacion_edad: p.clasificacion_edad,
        idioma_original: p.idioma_original,
        url_video: p.url_video,
        thumbnail_url: coalesce(p.thumbnail_url, p.poster_url),
        rating_average: round(coalesce(ratingAverage, 0) * 10) / 10.0,
        rating_count: ratingCount
      } AS movie
      LIMIT 1
      `,
      { id: Number(id) },
    );

    const movie = rows[0] ? rows[0].movie : undefined;
    if (movie && !movie.thumbnail_url) {
      try {
        const thumbsDir = path.join(
          __dirname,
          "..",
          "..",
          "frontend",
          "assets",
          "thumbnails",
        );
        if (fs.existsSync(thumbsDir)) {
          const files = fs.readdirSync(thumbsDir);
          const match = files.find((f) =>
            f.startsWith(`pelicula_${movie.id_pelicula}_`),
          );
          if (match) movie.thumbnail_url = `/assets/thumbnails/${match}`;
        }
      } catch (e) {
        // ignore
      }
    }
    return movie;
  }

  const { rows } = await pool.query(
    "SELECT * FROM pelicula WHERE id_pelicula = $1",
    [id],
  );
  const movie = rows[0];
  if (!movie) return undefined;
  const thumbsDir = path.join(
    __dirname,
    "..",
    "..",
    "frontend",
    "assets",
    "thumbnails",
  );
  if (!movie.thumbnail_url) {
    try {
      if (fs.existsSync(thumbsDir)) {
        const files = fs.readdirSync(thumbsDir);
        const match = files.find((f) =>
          f.startsWith(`pelicula_${movie.id_pelicula}_`),
        );
        if (match) movie.thumbnail_url = `/assets/thumbnails/${match}`;
      }
    } catch (e) {
      // ignore
    }
  }
  return movie;
}

async function getEpisodeById(id) {
  if (isNeo4jMediaEnabled()) {
    const rows = await runCypher(
      `
      MATCH (e:Episodio {id_episodio: $id})
      OPTIONAL MATCH (t:Temporada)-[:TIENE_EPISODIO]->(e)
      OPTIONAL MATCH (e)<-[:CALIFICO]-(rating:Calificacion)
      WITH e, t, avg(rating.puntuacion) AS ratingAverage, count(rating) AS ratingCount
      RETURN e {
        .* ,
        id_episodio: e.id_episodio,
        id_temporada: e.id_temporada,
        titulo: e.titulo,
        numero_episodio: e.numero_episodio,
        duracion_minutos: e.duracion_minutos,
        sinopsis: e.sinopsis,
        url_video: e.url_video,
        id_serie: t.id_serie,
        thumbnail_url: coalesce(e.thumbnail_url, e.poster_url),
        rating_average: round(coalesce(ratingAverage, 0) * 10) / 10.0,
        rating_count: ratingCount
      } AS episode
      LIMIT 1
      `,
      { id: Number(id) },
    );

    const episode = rows[0] ? rows[0].episode : undefined;
    if (episode && !episode.thumbnail_url) {
      try {
        const thumbsDir = path.join(
          __dirname,
          "..",
          "..",
          "frontend",
          "assets",
          "thumbnails",
        );
        if (fs.existsSync(thumbsDir)) {
          const files = fs.readdirSync(thumbsDir);
          const match = files.find((f) =>
            f.startsWith(`episodio_${episode.id_episodio}_`),
          );
          if (match) episode.thumbnail_url = `/assets/thumbnails/${match}`;
        }
      } catch (e) {
        // ignore
      }
    }
    return episode;
  }

  const { rows } = await pool.query(
    `SELECT e.*, t.id_serie
     FROM episodio e
     LEFT JOIN temporada t ON e.id_temporada = t.id_temporada
     WHERE e.id_episodio = $1`,
    [id],
  );
  return rows[0];
}

async function getEpisodesBySeries(seriesId) {
  if (isNeo4jMediaEnabled()) {
    const rows = await runCypher(
      `
      MATCH (s:Serie {id_serie: $seriesId})-[:TIENE_TEMPORADA]->(t:Temporada)-[:TIENE_EPISODIO]->(e:Episodio)
      OPTIONAL MATCH (e)<-[:CALIFICO]-(rating:Calificacion)
      WITH e, t, avg(rating.puntuacion) AS ratingAverage, count(rating) AS ratingCount
      RETURN e {
        .* ,
        id_episodio: e.id_episodio,
        id_temporada: e.id_temporada,
        titulo: e.titulo,
        numero_episodio: e.numero_episodio,
        duracion_minutos: e.duracion_minutos,
        sinopsis: e.sinopsis,
        url_video: e.url_video,
        thumbnail_url: coalesce(e.thumbnail_url, e.poster_url),
        rating_average: round(coalesce(ratingAverage, 0) * 10) / 10.0,
        rating_count: ratingCount
      } AS episode
      ORDER BY t.numero_temporada, e.numero_episodio
      `,
      { seriesId: Number(seriesId) },
    );

    const thumbsDir = path.join(
      __dirname,
      "..",
      "..",
      "frontend",
      "assets",
      "thumbnails",
    );
    return rows.map((r) => {
      const episode = r.episode;
      if (!episode.thumbnail_url) {
        try {
          if (fs.existsSync(thumbsDir)) {
            const files = fs.readdirSync(thumbsDir);
            const match = files.find((f) =>
              f.startsWith(`episodio_${episode.id_episodio}_`),
            );
            if (match) episode.thumbnail_url = `/assets/thumbnails/${match}`;
          }
        } catch (e) {
          // ignore
        }
      }
      return episode;
    });
  }

  const { rows } = await pool.query(
    `SELECT e.*
     FROM episodio e
     JOIN temporada t ON e.id_temporada = t.id_temporada
     WHERE t.id_serie = $1
     ORDER BY t.numero_temporada, e.numero_episodio`,
    [seriesId],
  );
  return rows;
}

async function saveMovieRating({ userId, movieId, puntuacion }) {
  const existing = await runCypher(
    `
      MATCH (u:Usuario {id_usuario: $userId})-[:REALIZO_CALIFICACION]->(c:Calificacion)-[:CALIFICO]->(p:Pelicula {id_pelicula: $movieId})
      RETURN c.id_calificacion AS id_calificacion
      LIMIT 1
    `,
    { userId: Number(userId), movieId: Number(movieId) },
  );

  if (existing.length) {
    await runCypher(
      `
        MATCH (c:Calificacion {id_calificacion: $id_calificacion})
        SET c.puntuacion = $puntuacion,
            c.fecha_calificacion = date()
      `,
      {
        id_calificacion: existing[0].id_calificacion,
        puntuacion: Number(puntuacion),
      },
    );

    return existing[0].id_calificacion;
  }

  const idCalificacion = await getNextCalificacionId();

  await runCypher(
    `
      MATCH (u:Usuario {id_usuario: $userId})
      MATCH (p:Pelicula {id_pelicula: $movieId})
      CREATE (c:Calificacion {
        id_calificacion: $id_calificacion,
        id_usuario: $userId,
        puntuacion: $puntuacion,
        fecha_calificacion: date()
      })
      MERGE (u)-[:REALIZO_CALIFICACION]->(c)
      MERGE (c)-[:CALIFICO]->(p)
    `,
    {
      userId: Number(userId),
      movieId: Number(movieId),
      id_calificacion: idCalificacion,
      puntuacion: Number(puntuacion),
    },
  );

  return idCalificacion;
}

async function saveEpisodeRating({ userId, episodeId, puntuacion }) {
  const existing = await runCypher(
    `
      MATCH (u:Usuario {id_usuario: $userId})-[:REALIZO_CALIFICACION]->(c:Calificacion)-[:CALIFICO]->(e:Episodio {id_episodio: $episodeId})
      RETURN c.id_calificacion AS id_calificacion
      LIMIT 1
    `,
    { userId: Number(userId), episodeId: Number(episodeId) },
  );

  if (existing.length) {
    await runCypher(
      `
        MATCH (c:Calificacion {id_calificacion: $id_calificacion})
        SET c.puntuacion = $puntuacion,
            c.fecha_calificacion = date()
      `,
      {
        id_calificacion: existing[0].id_calificacion,
        puntuacion: Number(puntuacion),
      },
    );

    return existing[0].id_calificacion;
  }

  const idCalificacion = await getNextCalificacionId();

  await runCypher(
    `
      MATCH (u:Usuario {id_usuario: $userId})
      MATCH (e:Episodio {id_episodio: $episodeId})
      CREATE (c:Calificacion {
        id_calificacion: $id_calificacion,
        id_usuario: $userId,
        puntuacion: $puntuacion,
        fecha_calificacion: date()
      })
      MERGE (u)-[:REALIZO_CALIFICACION]->(c)
      MERGE (c)-[:CALIFICO]->(e)
    `,
    {
      userId: Number(userId),
      episodeId: Number(episodeId),
      id_calificacion: idCalificacion,
      puntuacion: Number(puntuacion),
    },
  );

  return idCalificacion;
}

module.exports = {
  getAllMovies,
  getAllSeries,
  getMovieById,
  getEpisodeById,
  getEpisodesBySeries,
  saveMovieRating,
  saveEpisodeRating,
};
