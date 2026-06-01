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

async function getNextNeo4jId(label, field) {
  const rows = await runCypher(
    `
      MATCH (n:${label})
      RETURN coalesce(max(n.${field}), 0) + 1 AS next_id
    `,
  );

  return rows[0]?.next_id || 1;
}

async function ensureNeo4jEstadoReproduccion(tipoEstado) {
  const rows = await runCypher(
    `
      MATCH (e:EstadoReproduccion)
      WHERE toLower(e.tipo_estado) = toLower($tipo)
      RETURN e.id_estado AS id_estado
      ORDER BY e.id_estado DESC
      LIMIT 1
    `,
    { tipo: tipoEstado },
  );

  if (rows.length) {
    return rows[0].id_estado;
  }

  const nextId = await getNextNeo4jId("EstadoReproduccion", "id_estado");

  await runCypher(
    `
      CREATE (e:EstadoReproduccion {id_estado: $id_estado, tipo_estado: $tipo})
    `,
    { id_estado: nextId, tipo: tipoEstado },
  );

  return nextId;
}

async function ensureSqlEstadoReproduccion(tipoEstado) {
  const existing = await pool.query(
    `
      SELECT id_estado
      FROM estado_reproduccion
      WHERE LOWER(tipo_estado) = LOWER($1)
      LIMIT 1
    `,
    [tipoEstado],
  );

  if (existing.rows.length) {
    return existing.rows[0].id_estado;
  }

  const next = await pool.query(
    "SELECT COALESCE(MAX(id_estado), 0) + 1 AS next_id FROM estado_reproduccion",
  );
  const nextId = next.rows[0]?.next_id || 1;

  await pool.query(
    "INSERT INTO estado_reproduccion (id_estado, tipo_estado) VALUES ($1, $2)",
    [nextId, tipoEstado],
  );

  return nextId;
}

async function getMovieProgress(userId, movieId) {
  if (isNeo4jMediaEnabled()) {
    const rows = await runCypher(
      `
        MATCH (u:Usuario {id_usuario: $userId})-[:TIENE_HISTORIAL]->(h:Historial)-[r:REPRODUCIO]->(p:Pelicula {id_pelicula: $movieId})
        OPTIONAL MATCH (h)-[:CON_ESTADO]->(er:EstadoReproduccion)
        RETURN
          h.id_historial AS id_historial,
          h.tiempo_reproducido AS tiempo_reproducido,
          r.ultimo_minuto AS ultimo_minuto,
          er.tipo_estado AS tipo_estado,
          h.fecha_reproduccion AS fecha_reproduccion
        ORDER BY h.fecha_reproduccion DESC, h.id_historial DESC
        LIMIT 1
      `,
      { userId: Number(userId), movieId: Number(movieId) },
    );

    return rows[0] || null;
  }

  const { rows } = await pool.query(
    `
      SELECT
        h.id_historial,
        h.tiempo_reproducido,
        hp.ultimo_minuto,
        er.tipo_estado,
        h.fecha_reproduccion
      FROM historial h
      JOIN historial_pelicula hp
        ON h.id_historial = hp.id_historial
      LEFT JOIN estado_reproduccion er
        ON h.id_estado = er.id_estado
      WHERE h.id_usuario = $1
        AND hp.id_pelicula = $2
      ORDER BY h.fecha_reproduccion DESC, h.id_historial DESC
      LIMIT 1
    `,
    [userId, movieId],
  );

  return rows[0] || null;
}

async function getEpisodeProgress(userId, episodeId) {
  if (isNeo4jMediaEnabled()) {
    const rows = await runCypher(
      `
        MATCH (u:Usuario {id_usuario: $userId})-[:TIENE_HISTORIAL]->(h:Historial)-[r:REPRODUCIO]->(e:Episodio {id_episodio: $episodeId})
        OPTIONAL MATCH (h)-[:CON_ESTADO]->(er:EstadoReproduccion)
        RETURN
          h.id_historial AS id_historial,
          h.tiempo_reproducido AS tiempo_reproducido,
          r.ultimo_minuto AS ultimo_minuto,
          er.tipo_estado AS tipo_estado,
          h.fecha_reproduccion AS fecha_reproduccion
        ORDER BY h.fecha_reproduccion DESC, h.id_historial DESC
        LIMIT 1
      `,
      { userId: Number(userId), episodeId: Number(episodeId) },
    );

    return rows[0] || null;
  }

  const { rows } = await pool.query(
    `
      SELECT
        h.id_historial,
        h.tiempo_reproducido,
        he.ultimo_minuto,
        er.tipo_estado,
        h.fecha_reproduccion
      FROM historial h
      JOIN historial_episodio he
        ON h.id_historial = he.id_historial
      LEFT JOIN estado_reproduccion er
        ON h.id_estado = er.id_estado
      WHERE h.id_usuario = $1
        AND he.id_episodio = $2
      ORDER BY h.fecha_reproduccion DESC, h.id_historial DESC
      LIMIT 1
    `,
    [userId, episodeId],
  );

  return rows[0] || null;
}

async function upsertMovieProgress({ userId, movieId, minutos, estado }) {
  if (isNeo4jMediaEnabled()) {
    const estadoId = await ensureNeo4jEstadoReproduccion(estado);
    const existing = await runCypher(
      `
        MATCH (u:Usuario {id_usuario: $userId})-[:TIENE_HISTORIAL]->(h:Historial)-[r:REPRODUCIO]->(p:Pelicula {id_pelicula: $movieId})
        RETURN h.id_historial AS id_historial
        LIMIT 1
      `,
      { userId: Number(userId), movieId: Number(movieId) },
    );

    if (existing.length) {
      const historialId = existing[0].id_historial;
      await runCypher(
        `
          MATCH (h:Historial {id_historial: $id_historial})-[r:REPRODUCIO]->(p:Pelicula {id_pelicula: $movieId})
          SET h.fecha_reproduccion = date(),
              h.tiempo_reproducido = CASE
                WHEN h.tiempo_reproducido IS NULL OR h.tiempo_reproducido < $minutos THEN $minutos
                ELSE h.tiempo_reproducido
              END,
              r.ultimo_minuto = $minutos
        `,
        { id_historial: historialId, movieId: Number(movieId), minutos },
      );

      await runCypher(
        `
          MATCH (h:Historial {id_historial: $id_historial})
          MATCH (e:EstadoReproduccion {id_estado: $id_estado})
          OPTIONAL MATCH (h)-[old:CON_ESTADO]->(:EstadoReproduccion)
          DELETE old
          MERGE (h)-[:CON_ESTADO]->(e)
        `,
        { id_historial: historialId, id_estado: estadoId },
      );

      return {
        id_historial: historialId,
        ultimo_minuto: minutos,
        tipo_estado: estado,
      };
    }

    const historialId = await getNextNeo4jId("Historial", "id_historial");

    await runCypher(
      `
        MATCH (u:Usuario {id_usuario: $userId})
        MATCH (p:Pelicula {id_pelicula: $movieId})
        CREATE (h:Historial {
          id_historial: $id_historial,
          id_usuario: $userId,
          fecha_reproduccion: date(),
          tiempo_reproducido: $minutos
        })
        MERGE (u)-[:TIENE_HISTORIAL]->(h)
        MERGE (h)-[:REPRODUCIO {ultimo_minuto: $minutos}]->(p)
      `,
      {
        userId: Number(userId),
        movieId: Number(movieId),
        id_historial: historialId,
        minutos,
      },
    );

    await runCypher(
      `
        MATCH (h:Historial {id_historial: $id_historial})
        MATCH (e:EstadoReproduccion {id_estado: $id_estado})
        MERGE (h)-[:CON_ESTADO]->(e)
      `,
      { id_historial: historialId, id_estado: estadoId },
    );

    return {
      id_historial: historialId,
      ultimo_minuto: minutos,
      tipo_estado: estado,
    };
  }

  const estadoId = await ensureSqlEstadoReproduccion(estado);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const existing = await client.query(
      `
        SELECT h.id_historial, h.tiempo_reproducido
        FROM historial h
        JOIN historial_pelicula hp
          ON h.id_historial = hp.id_historial
        WHERE h.id_usuario = $1
          AND hp.id_pelicula = $2
        ORDER BY h.fecha_reproduccion DESC, h.id_historial DESC
        LIMIT 1
      `,
      [userId, movieId],
    );

    let historialId;

    if (existing.rows.length) {
      historialId = existing.rows[0].id_historial;
      await client.query(
        `
          UPDATE historial
          SET fecha_reproduccion = NOW(),
              tiempo_reproducido = GREATEST(COALESCE(tiempo_reproducido, 0), $1),
              id_estado = $2
          WHERE id_historial = $3
        `,
        [minutos, estadoId, historialId],
      );

      await client.query(
        `
          UPDATE historial_pelicula
          SET ultimo_minuto = $1
          WHERE id_historial = $2
            AND id_pelicula = $3
        `,
        [minutos, historialId, movieId],
      );
    } else {
      const nextIdRows = await client.query(
        "SELECT COALESCE(MAX(id_historial), 0) + 1 AS next_id FROM historial",
      );
      historialId = nextIdRows.rows[0]?.next_id || 1;

      await client.query(
        `
          INSERT INTO historial (id_historial, id_usuario, fecha_reproduccion, tiempo_reproducido, id_estado)
          VALUES ($1, $2, NOW(), $3, $4)
        `,
        [historialId, userId, minutos, estadoId],
      );

      await client.query(
        `
          INSERT INTO historial_pelicula (id_historial, id_pelicula, ultimo_minuto)
          VALUES ($1, $2, $3)
        `,
        [historialId, movieId, minutos],
      );
    }

    await client.query("COMMIT");
    return {
      id_historial: historialId,
      ultimo_minuto: minutos,
      tipo_estado: estado,
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function upsertEpisodeProgress({ userId, episodeId, minutos, estado }) {
  if (isNeo4jMediaEnabled()) {
    const estadoId = await ensureNeo4jEstadoReproduccion(estado);
    const existing = await runCypher(
      `
        MATCH (u:Usuario {id_usuario: $userId})-[:TIENE_HISTORIAL]->(h:Historial)-[r:REPRODUCIO]->(e:Episodio {id_episodio: $episodeId})
        RETURN h.id_historial AS id_historial
        LIMIT 1
      `,
      { userId: Number(userId), episodeId: Number(episodeId) },
    );

    if (existing.length) {
      const historialId = existing[0].id_historial;
      await runCypher(
        `
          MATCH (h:Historial {id_historial: $id_historial})-[r:REPRODUCIO]->(e:Episodio {id_episodio: $episodeId})
          SET h.fecha_reproduccion = date(),
              h.tiempo_reproducido = CASE
                WHEN h.tiempo_reproducido IS NULL OR h.tiempo_reproducido < $minutos THEN $minutos
                ELSE h.tiempo_reproducido
              END,
              r.ultimo_minuto = $minutos
        `,
        { id_historial: historialId, episodeId: Number(episodeId), minutos },
      );

      await runCypher(
        `
          MATCH (h:Historial {id_historial: $id_historial})
          MATCH (e:EstadoReproduccion {id_estado: $id_estado})
          OPTIONAL MATCH (h)-[old:CON_ESTADO]->(:EstadoReproduccion)
          DELETE old
          MERGE (h)-[:CON_ESTADO]->(e)
        `,
        { id_historial: historialId, id_estado: estadoId },
      );

      return {
        id_historial: historialId,
        ultimo_minuto: minutos,
        tipo_estado: estado,
      };
    }

    const historialId = await getNextNeo4jId("Historial", "id_historial");

    await runCypher(
      `
        MATCH (u:Usuario {id_usuario: $userId})
        MATCH (e:Episodio {id_episodio: $episodeId})
        CREATE (h:Historial {
          id_historial: $id_historial,
          id_usuario: $userId,
          fecha_reproduccion: date(),
          tiempo_reproducido: $minutos
        })
        MERGE (u)-[:TIENE_HISTORIAL]->(h)
        MERGE (h)-[:REPRODUCIO {ultimo_minuto: $minutos}]->(e)
      `,
      {
        userId: Number(userId),
        episodeId: Number(episodeId),
        id_historial: historialId,
        minutos,
      },
    );

    await runCypher(
      `
        MATCH (h:Historial {id_historial: $id_historial})
        MATCH (e:EstadoReproduccion {id_estado: $id_estado})
        MERGE (h)-[:CON_ESTADO]->(e)
      `,
      { id_historial: historialId, id_estado: estadoId },
    );

    return {
      id_historial: historialId,
      ultimo_minuto: minutos,
      tipo_estado: estado,
    };
  }

  const estadoId = await ensureSqlEstadoReproduccion(estado);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const existing = await client.query(
      `
        SELECT h.id_historial, h.tiempo_reproducido
        FROM historial h
        JOIN historial_episodio he
          ON h.id_historial = he.id_historial
        WHERE h.id_usuario = $1
          AND he.id_episodio = $2
        ORDER BY h.fecha_reproduccion DESC, h.id_historial DESC
        LIMIT 1
      `,
      [userId, episodeId],
    );

    let historialId;

    if (existing.rows.length) {
      historialId = existing.rows[0].id_historial;
      await client.query(
        `
          UPDATE historial
          SET fecha_reproduccion = NOW(),
              tiempo_reproducido = GREATEST(COALESCE(tiempo_reproducido, 0), $1),
              id_estado = $2
          WHERE id_historial = $3
        `,
        [minutos, estadoId, historialId],
      );

      await client.query(
        `
          UPDATE historial_episodio
          SET ultimo_minuto = $1
          WHERE id_historial = $2
            AND id_episodio = $3
        `,
        [minutos, historialId, episodeId],
      );
    } else {
      const nextIdRows = await client.query(
        "SELECT COALESCE(MAX(id_historial), 0) + 1 AS next_id FROM historial",
      );
      historialId = nextIdRows.rows[0]?.next_id || 1;

      await client.query(
        `
          INSERT INTO historial (id_historial, id_usuario, fecha_reproduccion, tiempo_reproducido, id_estado)
          VALUES ($1, $2, NOW(), $3, $4)
        `,
        [historialId, userId, minutos, estadoId],
      );

      await client.query(
        `
          INSERT INTO historial_episodio (id_historial, id_episodio, ultimo_minuto)
          VALUES ($1, $2, $3)
        `,
        [historialId, episodeId, minutos],
      );
    }

    await client.query("COMMIT");
    return {
      id_historial: historialId,
      ultimo_minuto: minutos,
      tipo_estado: estado,
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
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
  getMovieProgress,
  getEpisodeProgress,
  upsertMovieProgress,
  upsertEpisodeProgress,
  saveMovieRating,
  saveEpisodeRating,
};
