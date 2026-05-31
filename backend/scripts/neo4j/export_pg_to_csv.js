const fs = require("fs");
const path = require("path");
const pool = require("../../config/db");

const TABLE_EXPORTS = [
  {
    file: "usuario.csv",
    query:
      "SELECT id_usuario, nombre_completo, correo, contrasena, pais, fecha_registro, estado_cuenta, rol FROM usuario ORDER BY id_usuario",
  },
  {
    file: "estado_reproduccion.csv",
    query:
      "SELECT id_estado, tipo_estado FROM estado_reproduccion ORDER BY id_estado",
  },
  {
    file: "distribuidor.csv",
    query:
      "SELECT id_distribuidor, nombre FROM distribuidor ORDER BY id_distribuidor",
  },
  {
    file: "genero.csv",
    query: "SELECT id_genero, nombre_genero FROM genero ORDER BY id_genero",
  },
  {
    file: "participante.csv",
    query:
      "SELECT id_participante, nombre_participante, pais_origen, fecha_nacimiento FROM participante ORDER BY id_participante",
  },
  {
    file: "dispositivo.csv",
    query:
      "SELECT id_dispositivo, id_usuario, tipo_dispositivo, sistema_operativo, fecha_registro_dispositivo FROM dispositivo ORDER BY id_dispositivo",
  },
  {
    file: "calificacion.csv",
    query:
      "SELECT id_calificacion, id_usuario, puntuacion, fecha_calificacion FROM calificacion ORDER BY id_calificacion",
  },
  {
    file: "historial.csv",
    query:
      "SELECT id_historial, id_usuario, fecha_reproduccion, tiempo_reproducido, id_estado FROM historial ORDER BY id_historial",
  },
  {
    file: "serie.csv",
    query:
      "SELECT id_serie, id_distribuidor, titulo, sinopsis, anio_inicio_emision, numero_temporadas, clasificacion_edad, estado_serie FROM serie ORDER BY id_serie",
  },
  {
    file: "temporada.csv",
    query:
      "SELECT id_temporada, id_serie, numero_temporada, anio_lanzamiento FROM temporada ORDER BY id_temporada",
  },
  {
    file: "episodio.csv",
    query:
      "SELECT id_episodio, id_temporada, titulo, numero_episodio, duracion_minutos, sinopsis, url_video FROM episodio ORDER BY id_episodio",
  },
  {
    file: "pelicula.csv",
    query:
      "SELECT id_pelicula, id_distribuidor, titulo, sinopsis, anio_estreno, duracion_minutos, clasificacion_edad, idioma_original, url_video FROM pelicula ORDER BY id_pelicula",
  },
  {
    file: "pelicula_genero.csv",
    query:
      "SELECT id_pelicula, id_genero, genero_principal FROM pelicula_genero ORDER BY id_pelicula, id_genero",
  },
  {
    file: "episodio_genero.csv",
    query:
      "SELECT id_episodio, id_genero, genero_principal FROM episodio_genero ORDER BY id_episodio, id_genero",
  },
  {
    file: "participante_pelicula.csv",
    query:
      "SELECT id_participante, id_pelicula, rol FROM participante_pelicula ORDER BY id_participante, id_pelicula",
  },
  {
    file: "participante_episodio.csv",
    query:
      "SELECT id_participante, id_episodio, rol FROM participante_episodio ORDER BY id_participante, id_episodio",
  },
  {
    file: "historial_pelicula.csv",
    query:
      "SELECT id_historial, id_pelicula, ultimo_minuto FROM historial_pelicula ORDER BY id_historial, id_pelicula",
  },
  {
    file: "historial_episodio.csv",
    query:
      "SELECT id_historial, id_episodio, ultimo_minuto FROM historial_episodio ORDER BY id_historial, id_episodio",
  },
  {
    file: "calificacion_pelicula.csv",
    query:
      "SELECT id_calificacion, id_pelicula, fecha_calificacion_p FROM calificacion_pelicula ORDER BY id_calificacion, id_pelicula",
  },
  {
    file: "calificacion_episodio.csv",
    query:
      "SELECT id_calificacion, id_episodio, fecha_calificacion_ep FROM calificacion_episodio ORDER BY id_calificacion, id_episodio",
  },
];

function escapeCsv(value) {
  if (value === null || value === undefined) {
    return "";
  }

  const stringValue = String(value);
  if (
    stringValue.includes(",") ||
    stringValue.includes("\n") ||
    stringValue.includes("\r") ||
    stringValue.includes('"')
  ) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

function toCsv(rows, columns) {
  const header = columns.join(",");
  const lines = rows.map((row) =>
    columns.map((column) => escapeCsv(row[column])).join(","),
  );
  return `${header}\n${lines.join("\n")}\n`;
}

async function main() {
  const outputDir = process.argv[2]
    ? path.resolve(process.argv[2])
    : path.resolve(process.cwd(), "migrations", "neo4j", "csv");

  fs.mkdirSync(outputDir, { recursive: true });

  console.log(`Exportando CSV a: ${outputDir}`);

  for (const item of TABLE_EXPORTS) {
    const { rows, fields } = await pool.query(item.query);
    const columns = fields.map((field) => field.name);
    const csvContent = toCsv(rows, columns);
    const filePath = path.join(outputDir, item.file);
    fs.writeFileSync(filePath, csvContent, "utf8");
    console.log(`✔ ${item.file} (${rows.length} filas)`);
  }

  await pool.end();
  console.log("Exportación completada.");
}

main().catch(async (error) => {
  console.error("Error en exportación CSV:", error.message);
  try {
    await pool.end();
  } catch {
    // ignore
  }
  process.exit(1);
});
