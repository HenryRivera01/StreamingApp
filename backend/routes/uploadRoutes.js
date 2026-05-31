/* vercion con defectos por falta de validacion y creacion de duplicados en relaciones
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pool = require('../config/db');
const { runCypher } = require('../config/neo4j');
const { isNeo4jUploadsEnabled } = require('../config/migrationFlags');
const { authMiddleware, adminMiddleware } = require('../middleware/authMiddleware');
const { nextId } = require('../utils/ids');

// Ruta base de media (común)
const BASE_MEDIA = process.env.BASE_MEDIA_PATH || path.join(__dirname, '..', 'media');

// Carpetas específicas
const moviesDir = path.join(BASE_MEDIA, 'peliculas');
const seriesDir = path.join(BASE_MEDIA, 'series');

// Aseguramos que existan
if (!fs.existsSync(moviesDir)) {
  fs.mkdirSync(moviesDir, { recursive: true });
}
if (!fs.existsSync(seriesDir)) {
  fs.mkdirSync(seriesDir, { recursive: true });
}

/* ===========================
   STORAGE Y UPLOAD PARA PELÍCULAS
   =========================== */

/*const storageMovies = multer.diskStorage({
  destination: (req, file, cb) => {
    const { titulo, anio } = req.body;
    const folderName = anio ? `${titulo} (${anio})` : titulo;
    const dest = path.join(moviesDir, folderName);
    fs.mkdirSync(dest, { recursive: true });
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname); // p.ej. movie.mp4
  },
});

const uploadMovie = multer({
  storage: storageMovies,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== '.mp4') {
      return cb(new Error('Solo se permiten archivos .mp4'));
    }
    cb(null, true);
  },
});

// POST /api/media/upload-movie
router.post(
  '/upload-movie',
  authMiddleware,
  adminMiddleware,
  uploadMovie.single('file'),
  async (req, res) => {
    const client = await pool.connect();
    try {
      const {
        titulo,
        anio,
        sinopsis,
        clasificacion,
        idioma,
        distribuidor_id,
        distribuidor_nuevo,
        generos_ids,          // "1,2,3"
        genero_principal_id,  // id de género principal
        participantes_text    // líneas "Nombre|Rol"
      } = req.body;

      if (!req.file) {
        return res.status(400).json({ message: 'Archivo de video requerido' });
      }
      if (!titulo) {
        return res.status(400).json({ message: 'Título requerido' });
      }

      await client.query('BEGIN');

      // 1) Distribuidor
      let idDistribuidor = null;
      if (distribuidor_id) {
        idDistribuidor = parseInt(distribuidor_id, 10);
      } else if (distribuidor_nuevo) {
        const nuevoId = await nextId('distribuidor', 'id_distribuidor');
        await client.query(
          'INSERT INTO distribuidor (id_distribuidor, nombre) VALUES ($1, $2)',
          [nuevoId, distribuidor_nuevo]
        );
        idDistribuidor = nuevoId;
      }

      // 2) Película
      const idPelicula = await nextId('pelicula', 'id_pelicula');
      const relPath = path.relative(process.cwd(), req.file.path);

      await client.query(
        `INSERT INTO pelicula (
          id_pelicula, id_distribuidor, titulo, sinopsis, anio_estreno,
          duracion_minutos, clasificacion_edad, idioma_original, url_video
        ) VALUES (
          $1, $2, $3, $4, $5,
          NULL, $6, $7, $8
        )`,
        [
          idPelicula,
          idDistribuidor,
          titulo,
          sinopsis || null,
          anio ? parseInt(anio, 10) : null,
          clasificacion || null,
          idioma || null,
          relPath,
        ]
      );

      // 3) Géneros → Pelicula_Genero
      if (generos_ids) {
        const idsArray = Array.isArray(generos_ids)
          ? generos_ids
          : generos_ids.split(',').map(s => s.trim()).filter(Boolean);

        for (const gid of idsArray) {
          const idGenero = parseInt(gid, 10);
          const esPrincipal =
            genero_principal_id &&
            parseInt(genero_principal_id, 10) === idGenero;

          await client.query(
            `INSERT INTO pelicula_genero (id_pelicula, id_genero, genero_principal)
             VALUES ($1, $2, $3)`,
            [idPelicula, idGenero, esPrincipal ? 'PRINCIPAL' : 'SECUNDARIO']
          );
        }
      }

      // 4) Participantes → Participante + Participante_Pelicula
      if (participantes_text) {
        const lineas = participantes_text
          .split('\n')
          .map(l => l.trim())
          .filter(Boolean);

        for (const linea of lineas) {
          const [nombre, rol] = linea.split('|').map(s => s.trim());
          if (!nombre) continue;

          const idParticipante = await nextId('participante', 'id_participante');

          await client.query(
            `INSERT INTO participante (id_participante, nombre_participante, pais_origen, fecha_nacimiento)
             VALUES ($1, $2, NULL, NULL)`,
            [idParticipante, nombre]
          );

          await client.query(
            `INSERT INTO participante_pelicula (id_participante, id_pelicula, rol)
             VALUES ($1, $2, $3)`,
            [idParticipante, idPelicula, rol || null]
          );
        }
      }

      await client.query('COMMIT');

      return res.status(201).json({
        message: 'Película subida y registrada con toda la metadata',
        id_pelicula: idPelicula,
      });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Error upload-movie', err);
      return res.status(500).json({ message: 'Error subiendo película' });
    } finally {
      client.release();
    }
  }
);

/* ===========================
   STORAGE Y UPLOAD PARA SERIES / EPISODIOS
   =========================== */

/*const storageSeries = multer.diskStorage({
  destination: (req, file, cb) => {
    const { serie_titulo, numero_temporada } = req.body;
    const serieFolder = serie_titulo; // o el título de la serie existente
    const seasonFolder = `Season ${numero_temporada || 1}`;
    const dest = path.join(seriesDir, serieFolder, seasonFolder);
    fs.mkdirSync(dest, { recursive: true });
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname); // p.ej. S01E01.mp4
  },
});

const uploadSeries = multer({
  storage: storageSeries,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== '.mp4') {
      return cb(new Error('Solo se permiten archivos .mp4'));
    }
    cb(null, true);
  },
});

async function getNextNeo4jId(label, field) {
  const rows = await runCypher(
    `
      MATCH (n:${label})
      RETURN coalesce(max(n.${field}), 0) + 1 AS next_id
    `
  );

  return rows[0]?.next_id || 1;
}

async function getOrCreateNeo4jParticipante({ nombre, paisOrigen = null, fechaNacimiento = null }) {
  const existente = await runCypher(
    `
      MATCH (p:Participante)
      WHERE toLower(trim(p.nombre_participante)) = toLower(trim($nombre))
      RETURN p.id_participante AS id_participante
      LIMIT 1
    `,
    { nombre }
  );

  if (existente.length) {
    return existente[0].id_participante;
  }

  const idParticipante = await getNextNeo4jId('Participante', 'id_participante');

  await runCypher(
    `
      CREATE (p:Participante {
        id_participante: $id_participante,
        nombre_participante: $nombre,
        pais_origen: $pais_origen,
        fecha_nacimiento: $fecha_nacimiento
      })
    `,
    {
      id_participante: idParticipante,
      nombre,
      pais_origen: paisOrigen,
      fecha_nacimiento: fechaNacimiento,
    }
  );

  return idParticipante;
}

async function resolveNeo4jDistribuidor({ distribuidorId, distribuidorNuevo }) {
  if (distribuidorId) {
    return Number(distribuidorId);
  }

  if (!distribuidorNuevo || !distribuidorNuevo.trim()) {
    return null;
  }

  const nombre = distribuidorNuevo.trim();
  const existente = await runCypher(
    `
      MATCH (d:Distribuidor)
      WHERE toLower(trim(d.nombre)) = toLower(trim($nombre))
      RETURN d.id_distribuidor AS id_distribuidor
      LIMIT 1
    `,
    { nombre }
  );

  if (existente.length) {
    return existente[0].id_distribuidor;
  }

  const idDistribuidor = await getNextNeo4jId('Distribuidor', 'id_distribuidor');

  await runCypher(
    `
      CREATE (d:Distribuidor {
        id_distribuidor: $id_distribuidor,
        nombre: $nombre
      })
    `,
    { id_distribuidor: idDistribuidor, nombre }
  );

  return idDistribuidor;
}

// POST /api/media/upload-series-episode
router.post(
  '/upload-series-episode',
  authMiddleware,
  adminMiddleware,
  uploadSeries.single('file'),
  async (req, res) => {
    const client = await pool.connect();
    try {
      const {
        serie_id,
        serie_titulo,
        serie_sinopsis,
        serie_anio_inicio,
        serie_clasificacion,
        serie_estado,
        distribuidor_id,
        distribuidor_nuevo,

        numero_temporada,
        anio_lanzamiento_temp,

        episodio_titulo,
        numero_episodio,
        episodio_sinopsis,
        duracion_minutos,

        generos_ids,
        genero_principal_id,

        participantes_text
      } = req.body;

      if (!req.file) {
        return res.status(400).json({ message: 'Archivo de video requerido' });
      }
      if (!episodio_titulo) {
        return res.status(400).json({ message: 'Título del episodio requerido' });
      }

      await client.query('BEGIN');

      // 1) Distribuidor
      let idDistribuidor = null;
      if (distribuidor_id) {
        idDistribuidor = parseInt(distribuidor_id, 10);
      } else if (distribuidor_nuevo) {
        const nuevoDistId = await nextId('distribuidor', 'id_distribuidor');
        await client.query(
          'INSERT INTO distribuidor (id_distribuidor, nombre) VALUES ($1, $2)',
          [nuevoDistId, distribuidor_nuevo]
        );
        idDistribuidor = nuevoDistId;
      }

      // 2) Serie
      let idSerie = null;

      if (serie_id) {
        idSerie = parseInt(serie_id, 10);
      } else {
        if (!serie_titulo) {
          throw new Error('Debe indicar una serie existente o el título de una nueva');
        }
        const nuevoSerieId = await nextId('serie', 'id_serie');
        await client.query(
          `INSERT INTO serie (
            id_serie, id_distribuidor, titulo, sinopsis,
            anio_inicio_emision, numero_temp oradas, clasificacion_edad, estado_serie
          ) VALUES (
            $1, $2, $3, $4,
            $5, 1, $6, $7
          )`,
          [
            nuevoSerieId,
            idDistribuidor,
            serie_titulo,
            serie_sinopsis || null,
            serie_anio_inicio ? parseInt(serie_anio_inicio, 10) : null,
            serie_clasificacion || null,
            serie_estado || 'EN_EMISION',
          ]
        );
        idSerie = nuevoSerieId;
      }

      // 3) Temporada
      const numTemp = numero_temporada ? parseInt(numero_temporada, 10) : 1;
      let idTemporada = null;

      const tempRes = await client.query(
        'SELECT id_temporada FROM temporada WHERE id_serie = $1 AND numero_temporada = $2',
        [idSerie, numTemp]
      );

      if (tempRes.rows.length) {
        idTemporada = tempRes.rows[0].id_temporada;
      } else {
        idTemporada = await nextId('temporada', 'id_temporada');
        await client.query(
          `INSERT INTO temporada (id_temporada, id_serie, numero_temporada, anio_lanzamiento)
           VALUES ($1, $2, $3, $4)`,
          [
            idTemporada,
            idSerie,
            numTemp,
            anio_lanzamiento_temp ? parseInt(anio_lanzamiento_temp, 10) : null,
          ]
        );
      }

      // 4) Episodio
      const idEpisodio = await nextId('episodio', 'id_episodio');
      const relPath = path.relative(process.cwd(), req.file.path);

      await client.query(
        `INSERT INTO episodio (
          id_episodio, id_temporada, titulo, numero_episodio,
          duracion_minutos, sinopsis, url_video
        ) VALUES (
          $1, $2, $3, $4,
          $5, $6, $7
        )`,
        [
          idEpisodio,
          idTemporada,
          episodio_titulo,
          numero_episodio ? parseInt(numero_episodio, 10) : null,
          duracion_minutos ? parseInt(duracion_minutos, 10) : null,
          episodio_sinopsis || null,
          relPath,
        ]
      );

      // 5) Géneros → Episodio_Genero
      if (generos_ids) {
        const idsArray = Array.isArray(generos_ids)
          ? generos_ids
          : generos_ids.split(',').map(s => s.trim()).filter(Boolean);

        for (const gid of idsArray) {
          const idGenero = parseInt(gid, 10);
          const esPrincipal =
            genero_principal_id &&
            parseInt(genero_principal_id, 10) === idGenero;

          await client.query(
            `INSERT INTO episodio_genero (id_episodio, id_genero, genero_principal)
             VALUES ($1, $2, $3)`,
            [idEpisodio, idGenero, esPrincipal ? 'PRINCIPAL' : 'SECUNDARIO']
          );
        }
      }

      // 6) Participantes → Participante + Participante_Episodio
      if (participantes_text) {
        const lineas = participantes_text
          .split('\n')
          .map(l => l.trim())
          .filter(Boolean);

        for (const linea of lineas) {
          const [nombre, rol] = linea.split('|').map(s => s.trim());
          if (!nombre) continue;

          const idParticipante = await nextId('participante', 'id_participante');

          await client.query(
            `INSERT INTO participante (id_participante, nombre_participante, pais_origen, fecha_nacimiento)
             VALUES ($1, $2, NULL, NULL)`,
            [idParticipante, nombre]
          );

          await client.query(
            `INSERT INTO participante_episodio (id_participante, id_episodio, rol)
             VALUES ($1, $2, $3)`,
            [idParticipante, idEpisodio, rol || null]
          );
        }
      }

      // Intentar generar miniatura para episodio y, si la serie no tiene miniatura,
      // usar este fotograma como miniatura de la serie (SQL branch)
      try {
        const thumbFileName = `episodio_${idEpisodio}_${Date.now()}.jpg`;
        const thumbAbsPath = path.join(thumbsDir, thumbFileName);
        await generateThumbnail(req.file.path, thumbAbsPath, 1);
        const thumbUrl = `/assets/thumbnails/${thumbFileName}`;
        // Intentar actualizar columna thumbnail_url en episodio (si existe)
        try {
          await client.query(
            `UPDATE episodio SET thumbnail_url = $1 WHERE id_episodio = $2`,
            [thumbUrl, idEpisodio],
          );
        } catch (updErr) {
          // columna puede no existir, ignorar
        }

        // Si la serie no tiene miniatura, intentar actualizarla
        try {
          const sres = await client.query(
            `SELECT thumbnail_url FROM serie WHERE id_serie = $1 LIMIT 1`,
            [idSerie],
          );
          const existing = sres.rows[0] && sres.rows[0].thumbnail_url;
          if (!existing) {
            const seriesThumbName = `serie_${idSerie}_${Date.now()}.jpg`;
            const seriesThumbAbs = path.join(thumbsDir, seriesThumbName);
            fs.copyFileSync(thumbAbsPath, seriesThumbAbs);
            const seriesThumbUrl = `/assets/thumbnails/${seriesThumbName}`;
            try {
              await client.query(
                `UPDATE serie SET thumbnail_url = $1 WHERE id_serie = $2`,
                [seriesThumbUrl, idSerie],
              );
            } catch (upd2Err) {
              // columna puede no existir
            }
          }
        } catch (chkErr) {
          console.warn('Error chequeando/guardando thumbnail de serie en SQL:', chkErr.message);
        }
      } catch (genErr) {
        console.warn('No se pudo generar miniatura para episodio (SQL branch):', genErr.message);
      }

      await client.query('COMMIT');

      return res.status(201).json({
        message: 'Episodio de serie subido y registrado con toda la metadata',
        id_serie: idSerie,
        id_temporada: idTemporada,
        id_episodio: idEpisodio,
      });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Error upload-series-episode', err);
      return res.status(500).json({ message: 'Error subiendo episodio de serie' });
    } finally {
      client.release();
    }
  }
);

module.exports = router;*/

/*version corregida con validaciones y control de duplicados en relaciones*/

const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { exec } = require("child_process");
let ffmpegStaticPath = null;
try {
  ffmpegStaticPath = require("ffmpeg-static");
} catch (e) {
  // ffmpeg-static no está instalado; se intentará usar ffmpeg del sistema
  ffmpegStaticPath = null;
}
const pool = require("../config/db");
const { runCypher } = require("../config/neo4j");
const { isNeo4jUploadsEnabled } = require("../config/migrationFlags");
const {
  authMiddleware,
  adminMiddleware,
} = require("../middleware/authMiddleware");
const { nextId } = require("../utils/ids");

const BASE_MEDIA =
  process.env.BASE_MEDIA_PATH || path.join(__dirname, "..", "media");

const moviesDir = path.join(BASE_MEDIA, "peliculas");
const seriesDir = path.join(BASE_MEDIA, "series");

// Directorio público de miniaturas dentro del frontend para que Express las sirva
// uploadRoutes está en backend/routes -> subir dos niveles para llegar a streaming-platform
const thumbsDir = path.join(
  __dirname,
  "..",
  "..",
  "frontend",
  "assets",
  "thumbnails",
);
if (!fs.existsSync(thumbsDir)) {
  fs.mkdirSync(thumbsDir, { recursive: true });
}

function generateThumbnail(inputFilePath, outputFilePath, atSeconds = 1) {
  return new Promise((resolve, reject) => {
    // Extrae un fotograma con ffmpeg (requiere ffmpeg instalado en el sistema)
    const bin = ffmpegStaticPath || "ffmpeg";
    const cmd = `"${bin}" -y -ss ${atSeconds} -i "${inputFilePath}" -vframes 1 -q:v 2 "${outputFilePath}"`;
    exec(cmd, (err, stdout, stderr) => {
      if (err) {
        return reject(new Error(`ffmpeg error: ${stderr || err.message}`));
      }
      resolve();
    });
  });
}

if (!fs.existsSync(moviesDir)) {
  fs.mkdirSync(moviesDir, { recursive: true });
}

if (!fs.existsSync(seriesDir)) {
  fs.mkdirSync(seriesDir, { recursive: true });
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

async function getOrCreateNeo4jParticipante({
  nombre,
  paisOrigen = null,
  fechaNacimiento = null,
}) {
  const existente = await runCypher(
    `
      MATCH (p:Participante)
      WHERE toLower(trim(p.nombre_participante)) = toLower(trim($nombre))
      RETURN p.id_participante AS id_participante
      LIMIT 1
    `,
    { nombre },
  );

  if (existente.length) {
    return existente[0].id_participante;
  }

  const idParticipante = await getNextNeo4jId(
    "Participante",
    "id_participante",
  );

  await runCypher(
    `
      CREATE (p:Participante {
        id_participante: $id_participante,
        nombre_participante: $nombre,
        pais_origen: $pais_origen,
        fecha_nacimiento: $fecha_nacimiento
      })
    `,
    {
      id_participante: idParticipante,
      nombre,
      pais_origen: paisOrigen,
      fecha_nacimiento: fechaNacimiento,
    },
  );

  return idParticipante;
}

async function resolveNeo4jDistribuidor({ distribuidorId, distribuidorNuevo }) {
  if (distribuidorId) {
    return Number(distribuidorId);
  }

  if (!distribuidorNuevo || !distribuidorNuevo.trim()) {
    return null;
  }

  const nombre = distribuidorNuevo.trim();
  const existente = await runCypher(
    `
      MATCH (d:Distribuidor)
      WHERE toLower(trim(d.nombre)) = toLower(trim($nombre))
      RETURN d.id_distribuidor AS id_distribuidor
      LIMIT 1
    `,
    { nombre },
  );

  if (existente.length) {
    return existente[0].id_distribuidor;
  }

  const idDistribuidor = await getNextNeo4jId(
    "Distribuidor",
    "id_distribuidor",
  );

  await runCypher(
    `
      CREATE (d:Distribuidor {
        id_distribuidor: $id_distribuidor,
        nombre: $nombre
      })
    `,
    { id_distribuidor: idDistribuidor, nombre },
  );

  return idDistribuidor;
}

async function getOrCreateParticipante(
  client,
  nombre,
  paisOrigen = null,
  fechaNacimiento = null,
) {
  const existente = await client.query(
    `
      SELECT id_participante
      FROM participante
      WHERE LOWER(TRIM(nombre_participante)) = LOWER(TRIM($1))
      LIMIT 1
    `,
    [nombre],
  );

  if (existente.rows.length) {
    return existente.rows[0].id_participante;
  }

  const idParticipante = await nextId(
    client,
    "participante",
    "id_participante",
  );

  await client.query(
    `
      INSERT INTO participante (
        id_participante,
        nombre_participante,
        pais_origen,
        fecha_nacimiento
      ) VALUES ($1, $2, $3, $4)
    `,
    [idParticipante, nombre, paisOrigen, fechaNacimiento],
  );

  return idParticipante;
}

async function insertParticipantePeliculaIfNotExists(
  client,
  idParticipante,
  idPelicula,
  rol,
) {
  const existe = await client.query(
    `
      SELECT 1
      FROM participante_pelicula
      WHERE id_participante = $1
        AND id_pelicula = $2
        AND COALESCE(LOWER(rol), '') = COALESCE(LOWER($3), '')
      LIMIT 1
    `,
    [idParticipante, idPelicula, rol || null],
  );

  if (!existe.rows.length) {
    await client.query(
      `
        INSERT INTO participante_pelicula (id_participante, id_pelicula, rol)
        VALUES ($1, $2, $3)
      `,
      [idParticipante, idPelicula, rol || null],
    );
  }
}

async function insertParticipanteEpisodioIfNotExists(
  client,
  idParticipante,
  idEpisodio,
  rol,
) {
  const existe = await client.query(
    `
      SELECT 1
      FROM participante_episodio
      WHERE id_participante = $1
        AND id_episodio = $2
        AND COALESCE(LOWER(rol), '') = COALESCE(LOWER($3), '')
      LIMIT 1
    `,
    [idParticipante, idEpisodio, rol || null],
  );

  if (!existe.rows.length) {
    await client.query(
      `
        INSERT INTO participante_episodio (id_participante, id_episodio, rol)
        VALUES ($1, $2, $3)
      `,
      [idParticipante, idEpisodio, rol || null],
    );
  }
}

const storageMovies = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      const { titulo, anio } = req.body;
      const folderName = anio ? `${titulo} (${anio})` : titulo;
      const dest = path.join(moviesDir, folderName);
      fs.mkdirSync(dest, { recursive: true });
      cb(null, dest);
    } catch (err) {
      cb(err);
    }
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

const uploadMovie = multer({
  storage: storageMovies,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowed = [".mp4", ".mkv", ".webm"];
    if (!allowed.includes(ext)) {
      return cb(new Error("Extensión no permitida. Use mp4, mkv o webm"));
    }
    cb(null, true);
  },
});

const storageSeries = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      const { serie_titulo, numero_temporada, serie_id } = req.body;

      const fallbackSerieFolder =
        serie_titulo && serie_titulo.trim()
          ? serie_titulo.trim()
          : `serie_${serie_id || "sin_id"}`;

      const seasonFolder = `Season ${numero_temporada || 1}`;
      const dest = path.join(seriesDir, fallbackSerieFolder, seasonFolder);

      fs.mkdirSync(dest, { recursive: true });
      cb(null, dest);
    } catch (err) {
      cb(err);
    }
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

const uploadSeries = multer({
  storage: storageSeries,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowed = [".mp4", ".mkv", ".webm"];
    if (!allowed.includes(ext)) {
      return cb(new Error("Extensión no permitida. Use mp4, mkv o webm"));
    }
    cb(null, true);
  },
});

router.post(
  "/upload-movie",
  authMiddleware,
  adminMiddleware,
  uploadMovie.single("file"),
  async (req, res) => {
    let client;

    try {
      const {
        titulo,
        anio,
        sinopsis,
        duracion_minutos,
        clasificacion,
        idioma,
        distribuidor_id,
        distribuidor_nuevo,
        generos_ids,
        genero_principal_id,
        participantes_text,
      } = req.body;

      if (!req.file) {
        return res.status(400).json({ message: "Archivo de video requerido" });
      }

      if (!titulo || !titulo.trim()) {
        return res.status(400).json({ message: "Título requerido" });
      }

      // Validaciones adicionales
      if (anio && (!Number.isInteger(Number(anio)) || Number(anio) < 1888)) {
        return res
          .status(400)
          .json({ message: "Año inválido. Debe ser entero >= 1888" });
      }
      if (
        duracion_minutos &&
        (!Number.isFinite(Number(duracion_minutos)) ||
          Number(duracion_minutos) <= 0)
      ) {
        return res
          .status(400)
          .json({ message: "Duración inválida. Debe ser mayor que 0" });
      }

      if (isNeo4jUploadsEnabled()) {
        const idDistribuidor = await resolveNeo4jDistribuidor({
          distribuidorId: distribuidor_id,
          distribuidorNuevo: distribuidor_nuevo,
        });

        const idPelicula = await getNextNeo4jId("Pelicula", "id_pelicula");
        const relPath = path.relative(process.cwd(), req.file.path);

        await runCypher(
          `
            CREATE (p:Pelicula {
              id_pelicula: $id_pelicula,
              id_distribuidor: $id_distribuidor,
              titulo: $titulo,
              sinopsis: $sinopsis,
              anio_estreno: $anio_estreno,
              duracion_minutos: $duracion_minutos,
              clasificacion_edad: $clasificacion_edad,
              idioma_original: $idioma_original,
              url_video: $url_video
            })
          `,
          {
            id_pelicula: idPelicula,
            id_distribuidor: idDistribuidor,
            titulo: titulo.trim(),
            sinopsis: sinopsis || null,
            anio_estreno: anio ? parseInt(anio, 10) : null,
            duracion_minutos: duracion_minutos
              ? parseInt(duracion_minutos, 10)
              : null,
            clasificacion_edad: clasificacion || null,
            idioma_original: idioma || null,
            url_video: relPath,
          },
        );

        if (idDistribuidor) {
          await runCypher(
            `
              MATCH (p:Pelicula {id_pelicula: $id_pelicula})
              MATCH (d:Distribuidor {id_distribuidor: $id_distribuidor})
              MERGE (p)-[:DISTRIBUIDA_POR]->(d)
            `,
            { id_pelicula: idPelicula, id_distribuidor: idDistribuidor },
          );
        }

        if (generos_ids) {
          const idsArray = Array.isArray(generos_ids)
            ? generos_ids
            : generos_ids
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean);

          for (const gid of idsArray) {
            const idGenero = parseInt(gid, 10);
            const esPrincipal =
              genero_principal_id &&
              parseInt(genero_principal_id, 10) === idGenero;

            await runCypher(
              `
                MATCH (p:Pelicula {id_pelicula: $id_pelicula})
                MATCH (g:Genero {id_genero: $id_genero})
                MERGE (p)-[:TIENE_GENERO {genero_principal: $genero_principal}]->(g)
              `,
              {
                id_pelicula: idPelicula,
                id_genero: idGenero,
                genero_principal: esPrincipal ? "PRINCIPAL" : "SECUNDARIO",
              },
            );
          }
        }

        if (participantes_text) {
          const lineas = participantes_text
            .split("\n")
            .map((l) => l.trim())
            .filter(Boolean);

          for (const linea of lineas) {
            const partes = linea.split("|").map((s) => s.trim());
            const nombre = partes[0] || null;
            const rol = partes[1] || null;
            const paisOrigen = partes[2] || null;
            const fechaNacimiento = partes[3] || null;

            if (!nombre) continue;

            const idParticipante = await getOrCreateNeo4jParticipante({
              nombre,
              paisOrigen,
              fechaNacimiento,
            });

            await runCypher(
              `
                MATCH (p1:Participante {id_participante: $id_participante})
                MATCH (p2:Pelicula {id_pelicula: $id_pelicula})
                MERGE (p1)-[:PARTICIPA_EN {rol: $rol}]->(p2)
              `,
              {
                id_participante: idParticipante,
                id_pelicula: idPelicula,
                rol,
              },
            );
          }
        }

        // Intentamos generar una miniatura y guardar la URL en Neo4j
        try {
          const thumbFileName = `pelicula_${idPelicula}_${Date.now()}.jpg`;
          const thumbAbsPath = path.join(thumbsDir, thumbFileName);
          await generateThumbnail(req.file.path, thumbAbsPath, 1);
          const thumbUrl = `/assets/thumbnails/${thumbFileName}`;
          await runCypher(
            `MATCH (p:Pelicula {id_pelicula: $id_pelicula}) SET p.thumbnail_url = $thumbnail_url`,
            { id_pelicula: idPelicula, thumbnail_url: thumbUrl },
          );
        } catch (thumbErr) {
          console.warn(
            "No se pudo generar miniatura para película:",
            thumbErr.message,
          );
        }

        return res.status(201).json({
          message: "Película subida y registrada correctamente",
          id_pelicula: idPelicula,
          url_video: relPath,
        });
      }

      client = await pool.connect();

      await client.query("BEGIN");

      let idDistribuidor = null;

      if (distribuidor_id) {
        idDistribuidor = parseInt(distribuidor_id, 10);
      } else if (distribuidor_nuevo && distribuidor_nuevo.trim()) {
        const distribuidorExistente = await client.query(
          `
            SELECT id_distribuidor
            FROM distribuidor
            WHERE LOWER(TRIM(nombre)) = LOWER(TRIM($1))
            LIMIT 1
          `,
          [distribuidor_nuevo.trim()],
        );

        if (distribuidorExistente.rows.length) {
          idDistribuidor = distribuidorExistente.rows[0].id_distribuidor;
        } else {
          idDistribuidor = await nextId(
            client,
            "distribuidor",
            "id_distribuidor",
          );

          await client.query(
            `
              INSERT INTO distribuidor (id_distribuidor, nombre)
              VALUES ($1, $2)
            `,
            [idDistribuidor, distribuidor_nuevo.trim()],
          );
        }
      }

      const idPelicula = await nextId(client, "pelicula", "id_pelicula");
      const relPath = path.relative(process.cwd(), req.file.path);

      await client.query(
        `
          INSERT INTO pelicula (
            id_pelicula,
            id_distribuidor,
            titulo,
            sinopsis,
            anio_estreno,
            duracion_minutos,
            clasificacion_edad,
            idioma_original,
            url_video
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `,
        [
          idPelicula,
          idDistribuidor,
          titulo.trim(),
          sinopsis || null,
          anio ? parseInt(anio, 10) : null,
          duracion_minutos ? parseInt(duracion_minutos, 10) : null,
          clasificacion || null,
          idioma || null,
          relPath,
        ],
      );

      if (generos_ids) {
        const idsArray = Array.isArray(generos_ids)
          ? generos_ids
          : generos_ids
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean);

        for (const gid of idsArray) {
          const idGenero = parseInt(gid, 10);
          const esPrincipal =
            genero_principal_id &&
            parseInt(genero_principal_id, 10) === idGenero;

          const existeRelacion = await client.query(
            `
              SELECT 1
              FROM pelicula_genero
              WHERE id_pelicula = $1
                AND id_genero = $2
              LIMIT 1
            `,
            [idPelicula, idGenero],
          );

          if (!existeRelacion.rows.length) {
            await client.query(
              `
                INSERT INTO pelicula_genero (id_pelicula, id_genero, genero_principal)
                VALUES ($1, $2, $3)
              `,
              [idPelicula, idGenero, esPrincipal ? "PRINCIPAL" : "SECUNDARIO"],
            );
          }
        }
      }

      if (participantes_text) {
        const lineas = participantes_text
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean);

        for (const linea of lineas) {
          const partes = linea.split("|").map((s) => s.trim());

          const nombre = partes[0] || null;
          const rol = partes[1] || null;
          const paisOrigen = partes[2] || null;
          const fechaNacimiento = partes[3] || null;

          if (!nombre) continue;

          const idParticipante = await getOrCreateParticipante(
            client,
            nombre,
            paisOrigen,
            fechaNacimiento,
          );

          await insertParticipantePeliculaIfNotExists(
            client,
            idParticipante,
            idPelicula,
            rol,
          );
        }
      }

      await client.query("COMMIT");

      return res.status(201).json({
        message: "Película subida y registrada correctamente",
        id_pelicula: idPelicula,
        url_video: relPath,
      });
    } catch (err) {
      if (client) {
        await client.query("ROLLBACK");
      }
      console.error("Error upload-movie:", err);
      return res.status(500).json({
        message: "Error subiendo película",
        error: err.message,
      });
    } finally {
      if (client) {
        client.release();
      }
    }
  },
);

router.post(
  "/upload-series-episode",
  authMiddleware,
  adminMiddleware,
  uploadSeries.single("file"),
  async (req, res) => {
    let client;

    try {
      const {
        serie_id,
        serie_titulo,
        serie_sinopsis,
        serie_anio_inicio,
        serie_numero_temporadas,
        serie_clasificacion,
        serie_estado,
        distribuidor_id,
        distribuidor_nuevo,
        numero_temporada,
        anio_lanzamiento_temp,
        episodio_titulo,
        numero_episodio,
        duracion_minutos,
        episodio_sinopsis,
        generos_ids,
        genero_principal_id,
        participantes_text,
      } = req.body;

      if (!req.file) {
        return res.status(400).json({ message: "Archivo de video requerido" });
      }

      if (!episodio_titulo || !episodio_titulo.trim()) {
        return res
          .status(400)
          .json({ message: "Título del episodio requerido" });
      }

      // Validaciones adicionales para episodios/series
      if (
        numero_temporada &&
        (!Number.isInteger(Number(numero_temporada)) ||
          Number(numero_temporada) <= 0)
      ) {
        return res
          .status(400)
          .json({ message: "Número de temporada inválido" });
      }
      if (
        numero_episodio &&
        (!Number.isInteger(Number(numero_episodio)) ||
          Number(numero_episodio) <= 0)
      ) {
        return res.status(400).json({ message: "Número de episodio inválido" });
      }
      if (
        duracion_minutos &&
        (!Number.isFinite(Number(duracion_minutos)) ||
          Number(duracion_minutos) <= 0)
      ) {
        return res
          .status(400)
          .json({ message: "Duración inválida. Debe ser mayor que 0" });
      }
      if (!serie_id && (!serie_titulo || !serie_titulo.trim())) {
        return res
          .status(400)
          .json({
            message:
              "Debe indicar una serie existente o el título de una nueva",
          });
      }

      if (isNeo4jUploadsEnabled()) {
        const idDistribuidor = await resolveNeo4jDistribuidor({
          distribuidorId: distribuidor_id,
          distribuidorNuevo: distribuidor_nuevo,
        });

        let idSerie = null;
        let tituloSerie = null;

        if (serie_id) {
          idSerie = parseInt(serie_id, 10);
          const serieExistente = await runCypher(
            `
              MATCH (s:Serie {id_serie: $id_serie})
              RETURN s.id_serie AS id_serie, s.titulo AS titulo
              LIMIT 1
            `,
            { id_serie: idSerie },
          );

          if (!serieExistente.length) {
            throw new Error("La serie seleccionada no existe");
          }

          tituloSerie = serieExistente[0].titulo;
        } else {
          if (!serie_titulo || !serie_titulo.trim()) {
            throw new Error(
              "Debe indicar una serie existente o el título de una nueva",
            );
          }

          const serieExistentePorNombre = await runCypher(
            `
              MATCH (s:Serie)
              WHERE toLower(trim(s.titulo)) = toLower(trim($titulo))
              RETURN s.id_serie AS id_serie, s.titulo AS titulo
              LIMIT 1
            `,
            { titulo: serie_titulo.trim() },
          );

          if (serieExistentePorNombre.length) {
            idSerie = serieExistentePorNombre[0].id_serie;
            tituloSerie = serieExistentePorNombre[0].titulo;
          } else {
            idSerie = await getNextNeo4jId("Serie", "id_serie");
            tituloSerie = serie_titulo.trim();

            await runCypher(
              `
                CREATE (s:Serie {
                  id_serie: $id_serie,
                  id_distribuidor: $id_distribuidor,
                  titulo: $titulo,
                  sinopsis: $sinopsis,
                  anio_inicio_emision: $anio_inicio_emision,
                  numero_temporadas: $numero_temporadas,
                  clasificacion_edad: $clasificacion_edad,
                  estado_serie: $estado_serie
                })
              `,
              {
                id_serie: idSerie,
                id_distribuidor: idDistribuidor,
                titulo: tituloSerie,
                sinopsis: serie_sinopsis || null,
                anio_inicio_emision: serie_anio_inicio
                  ? parseInt(serie_anio_inicio, 10)
                  : null,
                numero_temporadas: serie_numero_temporadas
                  ? parseInt(serie_numero_temporadas, 10)
                  : 1,
                clasificacion_edad: serie_clasificacion || null,
                estado_serie: serie_estado || "EN_EMISION",
              },
            );

            if (idDistribuidor) {
              await runCypher(
                `
                  MATCH (s:Serie {id_serie: $id_serie})
                  MATCH (d:Distribuidor {id_distribuidor: $id_distribuidor})
                  MERGE (s)-[:DISTRIBUIDA_POR]->(d)
                `,
                { id_serie: idSerie, id_distribuidor: idDistribuidor },
              );
            }
          }
        }

        const numTemp = numero_temporada ? parseInt(numero_temporada, 10) : 1;
        let idTemporada = null;

        const tempExistente = await runCypher(
          `
            MATCH (t:Temporada {id_serie: $id_serie, numero_temporada: $numero_temporada})
            RETURN t.id_temporada AS id_temporada
            LIMIT 1
          `,
          { id_serie: idSerie, numero_temporada: numTemp },
        );

        if (tempExistente.length) {
          idTemporada = tempExistente[0].id_temporada;
        } else {
          idTemporada = await getNextNeo4jId("Temporada", "id_temporada");

          await runCypher(
            `
              CREATE (t:Temporada {
                id_temporada: $id_temporada,
                id_serie: $id_serie,
                numero_temporada: $numero_temporada,
                anio_lanzamiento: $anio_lanzamiento
              })
            `,
            {
              id_temporada: idTemporada,
              id_serie: idSerie,
              numero_temporada: numTemp,
              anio_lanzamiento: anio_lanzamiento_temp
                ? parseInt(anio_lanzamiento_temp, 10)
                : null,
            },
          );

          await runCypher(
            `
              MATCH (s:Serie {id_serie: $id_serie})
              MATCH (t:Temporada {id_temporada: $id_temporada})
              MERGE (s)-[:TIENE_TEMPORADA]->(t)
            `,
            { id_serie: idSerie, id_temporada: idTemporada },
          );
        }

        const idEpisodio = await getNextNeo4jId("Episodio", "id_episodio");
        const seasonFolder = `Season ${numTemp}`;
        const relPath = path.relative(
          process.cwd(),
          path.join(
            seriesDir,
            tituloSerie,
            seasonFolder,
            req.file.originalname,
          ),
        );

        await runCypher(
          `
            CREATE (e:Episodio {
              id_episodio: $id_episodio,
              id_temporada: $id_temporada,
              titulo: $titulo,
              numero_episodio: $numero_episodio,
              duracion_minutos: $duracion_minutos,
              sinopsis: $sinopsis,
              url_video: $url_video
            })
          `,
          {
            id_episodio: idEpisodio,
            id_temporada: idTemporada,
            titulo: episodio_titulo.trim(),
            numero_episodio: numero_episodio
              ? parseInt(numero_episodio, 10)
              : null,
            duracion_minutos: duracion_minutos
              ? parseInt(duracion_minutos, 10)
              : null,
            sinopsis: episodio_sinopsis || null,
            url_video: relPath,
          },
        );

        await runCypher(
          `
            MATCH (t:Temporada {id_temporada: $id_temporada})
            MATCH (e:Episodio {id_episodio: $id_episodio})
            MERGE (t)-[:TIENE_EPISODIO]->(e)
          `,
          { id_temporada: idTemporada, id_episodio: idEpisodio },
        );

        if (generos_ids) {
          const idsArray = Array.isArray(generos_ids)
            ? generos_ids
            : generos_ids
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean);

          for (const gid of idsArray) {
            const idGenero = parseInt(gid, 10);
            const esPrincipal =
              genero_principal_id &&
              parseInt(genero_principal_id, 10) === idGenero;

            await runCypher(
              `
                MATCH (e:Episodio {id_episodio: $id_episodio})
                MATCH (g:Genero {id_genero: $id_genero})
                MERGE (e)-[:TIENE_GENERO {genero_principal: $genero_principal}]->(g)
              `,
              {
                id_episodio: idEpisodio,
                id_genero: idGenero,
                genero_principal: esPrincipal ? "PRINCIPAL" : "SECUNDARIO",
              },
            );
          }
        }

        if (participantes_text) {
          const lineas = participantes_text
            .split("\n")
            .map((l) => l.trim())
            .filter(Boolean);

          for (const linea of lineas) {
            const partes = linea.split("|").map((s) => s.trim());
            const nombre = partes[0] || null;
            const rol = partes[1] || null;
            const paisOrigen = partes[2] || null;
            const fechaNacimiento = partes[3] || null;

            if (!nombre) continue;

            const idParticipante = await getOrCreateNeo4jParticipante({
              nombre,
              paisOrigen,
              fechaNacimiento,
            });

            await runCypher(
              `
                MATCH (p:Participante {id_participante: $id_participante})
                MATCH (e:Episodio {id_episodio: $id_episodio})
                MERGE (p)-[:PARTICIPA_EN {rol: $rol}]->(e)
              `,
              {
                id_participante: idParticipante,
                id_episodio: idEpisodio,
                rol,
              },
            );
          }
        }

        // Intentamos generar miniatura para el episodio y guardar en Neo4j
        try {
          const thumbFileName = `episodio_${idEpisodio}_${Date.now()}.jpg`;
          const thumbAbsPath = path.join(thumbsDir, thumbFileName);
          await generateThumbnail(req.file.path, thumbAbsPath, 1);
          const thumbUrl = `/assets/thumbnails/${thumbFileName}`;
          await runCypher(
            `MATCH (e:Episodio {id_episodio: $id_episodio}) SET e.thumbnail_url = $thumbnail_url`,
            { id_episodio: idEpisodio, thumbnail_url: thumbUrl },
          );

          // Si la serie aún no tiene miniatura, usamos este fotograma como miniatura de la serie
          try {
            const seriesThumbCheck = await runCypher(
              `MATCH (s:Serie {id_serie: $id}) RETURN s.thumbnail_url AS thumb LIMIT 1`,
              { id: idSerie },
            );
            const existing = seriesThumbCheck[0]?.thumb;
            if (!existing) {
              const seriesThumbName = `serie_${idSerie}_${Date.now()}.jpg`;
              const seriesThumbAbs = path.join(thumbsDir, seriesThumbName);
              // reutilizar el mismo archivo generado (copiar)
              try {
                fs.copyFileSync(thumbAbsPath, seriesThumbAbs);
                const seriesThumbUrl = `/assets/thumbnails/${seriesThumbName}`;
                await runCypher(
                  `MATCH (s:Serie {id_serie: $id}) SET s.thumbnail_url = $thumbnail_url`,
                  { id: idSerie, thumbnail_url: seriesThumbUrl },
                );
              } catch (copyErr) {
                console.warn('No se pudo copiar miniatura para serie:', copyErr.message);
              }
            }
          } catch (e) {
            console.warn('Error chequeando/guardando thumbnail de serie en Neo4j:', e.message);
          }
        } catch (thumbErr) {
          console.warn(
            "No se pudo generar miniatura para episodio:",
            thumbErr.message,
          );
        }

        return res.status(201).json({
          message: "Episodio de serie subido y registrado correctamente",
          id_serie: idSerie,
          id_temporada: idTemporada,
          id_episodio: idEpisodio,
          url_video: relPath,
        });
      }

      client = await pool.connect();

      await client.query("BEGIN");

      let idDistribuidor = null;

      if (distribuidor_id) {
        idDistribuidor = parseInt(distribuidor_id, 10);
      } else if (distribuidor_nuevo && distribuidor_nuevo.trim()) {
        const distribuidorExistente = await client.query(
          `
            SELECT id_distribuidor
            FROM distribuidor
            WHERE LOWER(TRIM(nombre)) = LOWER(TRIM($1))
            LIMIT 1
          `,
          [distribuidor_nuevo.trim()],
        );

        if (distribuidorExistente.rows.length) {
          idDistribuidor = distribuidorExistente.rows[0].id_distribuidor;
        } else {
          idDistribuidor = await nextId(
            client,
            "distribuidor",
            "id_distribuidor",
          );

          await client.query(
            `
              INSERT INTO distribuidor (id_distribuidor, nombre)
              VALUES ($1, $2)
            `,
            [idDistribuidor, distribuidor_nuevo.trim()],
          );
        }
      }

      let idSerie = null;
      let tituloSerie = null;

      if (serie_id) {
        idSerie = parseInt(serie_id, 10);

        const serieExistente = await client.query(
          `
            SELECT id_serie, titulo
            FROM serie
            WHERE id_serie = $1
            LIMIT 1
          `,
          [idSerie],
        );

        if (!serieExistente.rows.length) {
          throw new Error("La serie seleccionada no existe");
        }

        tituloSerie = serieExistente.rows[0].titulo;
      } else {
        if (!serie_titulo || !serie_titulo.trim()) {
          throw new Error(
            "Debe indicar una serie existente o el título de una nueva",
          );
        }

        const serieExistentePorNombre = await client.query(
          `
            SELECT id_serie, titulo
            FROM serie
            WHERE LOWER(TRIM(titulo)) = LOWER(TRIM($1))
            LIMIT 1
          `,
          [serie_titulo.trim()],
        );

        if (serieExistentePorNombre.rows.length) {
          idSerie = serieExistentePorNombre.rows[0].id_serie;
          tituloSerie = serieExistentePorNombre.rows[0].titulo;
        } else {
          idSerie = await nextId(client, "serie", "id_serie");
          tituloSerie = serie_titulo.trim();

          await client.query(
            `
              INSERT INTO serie (
                id_serie,
                id_distribuidor,
                titulo,
                sinopsis,
                anio_inicio_emision,
                numero_temporadas,
                clasificacion_edad,
                estado_serie
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            `,
            [
              idSerie,
              idDistribuidor,
              tituloSerie,
              serie_sinopsis || null,
              serie_anio_inicio ? parseInt(serie_anio_inicio, 10) : null,
              serie_numero_temporadas
                ? parseInt(serie_numero_temporadas, 10)
                : 1,
              serie_clasificacion || null,
              serie_estado || "EN_EMISION",
            ],
          );
        }
      }

      const numTemp = numero_temporada ? parseInt(numero_temporada, 10) : 1;

      let idTemporada = null;
      const tempRes = await client.query(
        `
          SELECT id_temporada
          FROM temporada
          WHERE id_serie = $1
            AND numero_temporada = $2
          LIMIT 1
        `,
        [idSerie, numTemp],
      );

      if (tempRes.rows.length) {
        idTemporada = tempRes.rows[0].id_temporada;
      } else {
        idTemporada = await nextId(client, "temporada", "id_temporada");

        await client.query(
          `
            INSERT INTO temporada (
              id_temporada,
              id_serie,
              numero_temporada,
              anio_lanzamiento
            ) VALUES ($1, $2, $3, $4)
          `,
          [
            idTemporada,
            idSerie,
            numTemp,
            anio_lanzamiento_temp ? parseInt(anio_lanzamiento_temp, 10) : null,
          ],
        );
      }

      const idEpisodio = await nextId(client, "episodio", "id_episodio");
      const seasonFolder = `Season ${numTemp}`;
      const relPath = path.relative(
        process.cwd(),
        path.join(seriesDir, tituloSerie, seasonFolder, req.file.originalname),
      );

      await client.query(
        `
          INSERT INTO episodio (
            id_episodio,
            id_temporada,
            titulo,
            numero_episodio,
            duracion_minutos,
            sinopsis,
            url_video
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `,
        [
          idEpisodio,
          idTemporada,
          episodio_titulo.trim(),
          numero_episodio ? parseInt(numero_episodio, 10) : null,
          duracion_minutos ? parseInt(duracion_minutos, 10) : null,
          episodio_sinopsis || null,
          relPath,
        ],
      );

      if (generos_ids) {
        const idsArray = Array.isArray(generos_ids)
          ? generos_ids
          : generos_ids
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean);

        for (const gid of idsArray) {
          const idGenero = parseInt(gid, 10);
          const esPrincipal =
            genero_principal_id &&
            parseInt(genero_principal_id, 10) === idGenero;

          const existeRelacion = await client.query(
            `
              SELECT 1
              FROM episodio_genero
              WHERE id_episodio = $1
                AND id_genero = $2
              LIMIT 1
            `,
            [idEpisodio, idGenero],
          );

          if (!existeRelacion.rows.length) {
            await client.query(
              `
                INSERT INTO episodio_genero (id_episodio, id_genero, genero_principal)
                VALUES ($1, $2, $3)
              `,
              [idEpisodio, idGenero, esPrincipal ? "PRINCIPAL" : "SECUNDARIO"],
            );
          }
        }
      }

      if (participantes_text) {
        const lineas = participantes_text
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean);

        for (const linea of lineas) {
          const partes = linea.split("|").map((s) => s.trim());

          const nombre = partes[0] || null;
          const rol = partes[1] || null;
          const paisOrigen = partes[2] || null;
          const fechaNacimiento = partes[3] || null;

          if (!nombre) continue;

          const idParticipante = await getOrCreateParticipante(
            client,
            nombre,
            paisOrigen,
            fechaNacimiento,
          );

          await insertParticipanteEpisodioIfNotExists(
            client,
            idParticipante,
            idEpisodio,
            rol,
          );
        }
      }

      await client.query("COMMIT");

      return res.status(201).json({
        message: "Episodio de serie subido y registrado correctamente",
        id_serie: idSerie,
        id_temporada: idTemporada,
        id_episodio: idEpisodio,
        url_video: relPath,
      });
    } catch (err) {
      if (client) {
        await client.query("ROLLBACK");
      }
      console.error("Error upload-series-episode:", err);
      return res.status(500).json({
        message: "Error subiendo episodio de serie",
        error: err.message,
      });
    } finally {
      if (client) {
        client.release();
      }
    }
  },
);

module.exports = router;
