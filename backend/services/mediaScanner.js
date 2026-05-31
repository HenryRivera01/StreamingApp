
const fs = require('fs');
const path = require('path');
const pool = require('../config/db');
const { searchMovieInTmdb } = require('./metadataService');

const BASE_MEDIA = process.env.BASE_MEDIA_PATH || path.join(__dirname, '..', 'media');

function walkDir(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).map(name => path.join(dir, name));
}

async function syncMoviesFromFs() {
  const moviesDir = path.join(BASE_MEDIA, 'peliculas');
  if (!fs.existsSync(moviesDir)) return;
  const movieFolders = fs.readdirSync(moviesDir);
  for (const folder of movieFolders) {
    const moviePath = path.join(moviesDir, folder);
    if (!fs.statSync(moviePath).isDirectory()) continue;
    const files = fs.readdirSync(moviePath);
    const videoFile = files.find(f => f.toLowerCase().endsWith('.mp4'));
    if (!videoFile) continue;
    const metadataPath = path.join(moviePath, 'metadata.json');
    let meta = { titulo: folder, anio: null, descripcion: null };
    if (fs.existsSync(metadataPath)) {
      try {
        const raw = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
        meta = { ...meta, ...raw };
      } catch (e) {
        console.warn('No se pudo leer metadata.json para', folder);
      }
    }
    if (!meta.anio) {
      const match = folder.match(/(.*)\((\d{4})\)/);
      if (match) {
        meta.titulo = match[1].trim();
        meta.anio = parseInt(match[2], 10);
      }
    }
    if (!meta.descripcion) {
      try {
        const tmdb = await searchMovieInTmdb(meta.titulo, meta.anio);
        if (tmdb) meta = { ...meta, descripcion: tmdb.descripcion };
      } catch (e) {
        console.warn('TMDB fallo para', meta.titulo);
      }
    }
    const urlVideo = path.relative(process.cwd(), path.join(moviePath, videoFile));
    await pool.query(
      `INSERT INTO pelicula (id_pelicula, titulo, sinopsis, anio_estreno, duracion_minutos, clasificacion_edad, idioma_original, url_video)
       VALUES ((SELECT COALESCE(MAX(id_pelicula)+1,1) FROM pelicula), $1,$2,$3,NULL,NULL,NULL,$4)
       ON CONFLICT DO NOTHING`,
      [meta.titulo, meta.descripcion, meta.anio, urlVideo]
    );
  }
}

async function syncAll() {
  await syncMoviesFromFs();
  // Extender con series/episodios similarmente
}

module.exports = { syncAll };
