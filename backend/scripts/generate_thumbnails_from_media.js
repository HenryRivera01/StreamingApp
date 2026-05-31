const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const ffmpeg = require("ffmpeg-static");
const { runCypher } = require("../config/neo4j");
const pool = require("../config/db");

async function generateThumbnail(inputFilePath, outputFilePath, atSeconds = 1) {
  return new Promise((resolve, reject) => {
    const bin = ffmpeg || "ffmpeg";
    const cmd = `"${bin}" -y -ss ${atSeconds} -i "${inputFilePath}" -vframes 1 -q:v 2 "${outputFilePath}"`;
    exec(cmd, (err, stdout, stderr) => {
      if (err) return reject(new Error(stderr || err.message));
      resolve();
    });
  });
}

function findFilesRecursive(dir, exts = [".mp4"]) {
  const result = [];
  if (!fs.existsSync(dir)) return result;
  const items = fs.readdirSync(dir);
  for (const it of items) {
    const full = path.join(dir, it);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      result.push(...findFilesRecursive(full, exts));
    } else if (stat.isFile()) {
      if (exts.includes(path.extname(full).toLowerCase())) result.push(full);
    }
  }
  return result;
}

async function processFile(filePath) {
  const fileName = path.basename(filePath);
  console.log("Procesando", filePath);
  const thumbsDir = path.join(
    __dirname,
    "..",
    "..",
    "frontend",
    "assets",
    "thumbnails",
  );
  if (!fs.existsSync(thumbsDir)) fs.mkdirSync(thumbsDir, { recursive: true });

  // Buscar coincidencia en Neo4j
  try {
    const rows = await runCypher(
      `MATCH (p:Pelicula) WHERE p.url_video CONTAINS $file RETURN p.id_pelicula AS id LIMIT 1`,
      { file: fileName },
    );
    if (rows.length) {
      const id = rows[0].id;
      const thumbName = `pelicula_${id}_${Date.now()}.jpg`;
      const outPath = path.join(thumbsDir, thumbName);
      await generateThumbnail(filePath, outPath, 1);
      const thumbUrl = `/assets/thumbnails/${thumbName}`;
      await runCypher(
        `MATCH (p:Pelicula {id_pelicula: $id}) SET p.thumbnail_url = $thumbUrl`,
        { id, thumbUrl },
      );
      console.log("Thumbnail creado y actualizado en Neo4j para pelicula", id);
      return;
    }
  } catch (e) {
    console.warn("Neo4j check failed:", e.message);
  }

  // Si no se encontró en Neo4j, intentar en Postgres
  try {
    const { rows } = await pool.query(
      `SELECT id_pelicula, url_video FROM pelicula WHERE url_video LIKE $1 LIMIT 1`,
      [`%${fileName}%`],
    );
    if (rows.length) {
      const id = rows[0].id_pelicula;
      const thumbName = `pelicula_${id}_${Date.now()}.jpg`;
      const outPath = path.join(thumbsDir, thumbName);
      await generateThumbnail(filePath, outPath, 1);
      const thumbUrl = `/assets/thumbnails/${thumbName}`;
      // Intentar actualizar columna thumbnail_url si existe
      try {
        await pool.query(
          `UPDATE pelicula SET thumbnail_url = $1 WHERE id_pelicula = $2`,
          [thumbUrl, id],
        );
        console.log("Thumbnail creado y actualizado en SQL para pelicula", id);
      } catch (updErr) {
        console.warn(
          "No se pudo actualizar columna thumbnail_url en SQL (quizá la columna no existe):",
          updErr.message,
        );
      }
      return;
    }
  } catch (e) {
    console.warn("SQL check failed:", e.message);
  }

  // Si no se encontró el registro, solo generar thumbnail con nombre basado en filename
  try {
    const safeName = fileName.replace(/[^a-z0-9\.\-_]/gi, "_");
    const thumbName = `file_${safeName}_${Date.now()}.jpg`;
    const outPath = path.join(thumbsDir, thumbName);
    await generateThumbnail(filePath, outPath, 1);
    console.log("Thumbnail creado (sin asociación) en", outPath);
  } catch (e) {
    console.warn("No se pudo generar miniatura para", filePath, e.message);
  }
}

async function main() {
  const maybeDir = process.argv[2] || path.join(__dirname, "..", "media");
  console.log("Buscando MP4 en", maybeDir);
  const files = findFilesRecursive(maybeDir);
  console.log("Encontrados", files.length, "archivos");
  for (const f of files) {
    try {
      // Evitar regenerar si ya existe thumbnail asociado
      await processFile(f);
    } catch (e) {
      console.error("Error procesando", f, e.message);
    }
  }
  console.log("Terminado");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
