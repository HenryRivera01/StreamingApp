const pool = require("../../config/db");
const { runCypher, closeNeo4jDriver } = require("../../config/neo4j");

const NODE_CHECKS = [
  {
    name: "Usuario",
    sql: "SELECT COUNT(*)::int AS total FROM usuario",
    cypher: "MATCH (n:Usuario) RETURN count(n) AS total",
  },
  {
    name: "EstadoReproduccion",
    sql: "SELECT COUNT(*)::int AS total FROM estado_reproduccion",
    cypher: "MATCH (n:EstadoReproduccion) RETURN count(n) AS total",
  },
  {
    name: "Distribuidor",
    sql: "SELECT COUNT(*)::int AS total FROM distribuidor",
    cypher: "MATCH (n:Distribuidor) RETURN count(n) AS total",
  },
  {
    name: "Genero",
    sql: "SELECT COUNT(*)::int AS total FROM genero",
    cypher: "MATCH (n:Genero) RETURN count(n) AS total",
  },
  {
    name: "Participante",
    sql: "SELECT COUNT(*)::int AS total FROM participante",
    cypher: "MATCH (n:Participante) RETURN count(n) AS total",
  },
  {
    name: "Dispositivo",
    sql: "SELECT COUNT(*)::int AS total FROM dispositivo",
    cypher: "MATCH (n:Dispositivo) RETURN count(n) AS total",
  },
  {
    name: "Calificacion",
    sql: "SELECT COUNT(*)::int AS total FROM calificacion",
    cypher: "MATCH (n:Calificacion) RETURN count(n) AS total",
  },
  {
    name: "Historial",
    sql: "SELECT COUNT(*)::int AS total FROM historial",
    cypher: "MATCH (n:Historial) RETURN count(n) AS total",
  },
  {
    name: "Serie",
    sql: "SELECT COUNT(*)::int AS total FROM serie",
    cypher: "MATCH (n:Serie) RETURN count(n) AS total",
  },
  {
    name: "Temporada",
    sql: "SELECT COUNT(*)::int AS total FROM temporada",
    cypher: "MATCH (n:Temporada) RETURN count(n) AS total",
  },
  {
    name: "Episodio",
    sql: "SELECT COUNT(*)::int AS total FROM episodio",
    cypher: "MATCH (n:Episodio) RETURN count(n) AS total",
  },
  {
    name: "Pelicula",
    sql: "SELECT COUNT(*)::int AS total FROM pelicula",
    cypher: "MATCH (n:Pelicula) RETURN count(n) AS total",
  },
];

const REL_CHECKS = [
  {
    name: "DISTRIBUIDA_POR (Serie+Pelicula)",
    sql: "SELECT ((SELECT COUNT(*) FROM serie WHERE id_distribuidor IS NOT NULL) + (SELECT COUNT(*) FROM pelicula WHERE id_distribuidor IS NOT NULL))::int AS total",
    cypher: "MATCH ()-[r:DISTRIBUIDA_POR]->() RETURN count(r) AS total",
  },
  {
    name: "TIENE_TEMPORADA",
    sql: "SELECT COUNT(*)::int AS total FROM temporada WHERE id_serie IS NOT NULL",
    cypher:
      "MATCH (:Serie)-[r:TIENE_TEMPORADA]->(:Temporada) RETURN count(r) AS total",
  },
  {
    name: "TIENE_EPISODIO",
    sql: "SELECT COUNT(*)::int AS total FROM episodio WHERE id_temporada IS NOT NULL",
    cypher:
      "MATCH (:Temporada)-[r:TIENE_EPISODIO]->(:Episodio) RETURN count(r) AS total",
  },
  {
    name: "PERTENECE_A",
    sql: "SELECT COUNT(*)::int AS total FROM dispositivo WHERE id_usuario IS NOT NULL",
    cypher:
      "MATCH (:Dispositivo)-[r:PERTENECE_A]->(:Usuario) RETURN count(r) AS total",
  },
  {
    name: "TIENE_HISTORIAL",
    sql: "SELECT COUNT(*)::int AS total FROM historial WHERE id_usuario IS NOT NULL",
    cypher:
      "MATCH (:Usuario)-[r:TIENE_HISTORIAL]->(:Historial) RETURN count(r) AS total",
  },
  {
    name: "CON_ESTADO",
    sql: "SELECT COUNT(*)::int AS total FROM historial WHERE id_estado IS NOT NULL",
    cypher:
      "MATCH (:Historial)-[r:CON_ESTADO]->(:EstadoReproduccion) RETURN count(r) AS total",
  },
  {
    name: "TIENE_GENERO (Pelicula)",
    sql: "SELECT COUNT(*)::int AS total FROM pelicula_genero",
    cypher:
      "MATCH (:Pelicula)-[r:TIENE_GENERO]->(:Genero) RETURN count(r) AS total",
  },
  {
    name: "TIENE_GENERO (Episodio)",
    sql: "SELECT COUNT(*)::int AS total FROM episodio_genero",
    cypher:
      "MATCH (:Episodio)-[r:TIENE_GENERO]->(:Genero) RETURN count(r) AS total",
  },
  {
    name: "PARTICIPA_EN (Pelicula)",
    sql: "SELECT COUNT(*)::int AS total FROM participante_pelicula",
    cypher:
      "MATCH (:Participante)-[r:PARTICIPA_EN]->(:Pelicula) RETURN count(r) AS total",
  },
  {
    name: "PARTICIPA_EN (Episodio)",
    sql: "SELECT COUNT(*)::int AS total FROM participante_episodio",
    cypher:
      "MATCH (:Participante)-[r:PARTICIPA_EN]->(:Episodio) RETURN count(r) AS total",
  },
  {
    name: "REPRODUCIO (Pelicula)",
    sql: "SELECT COUNT(*)::int AS total FROM historial_pelicula",
    cypher:
      "MATCH (:Historial)-[r:REPRODUCIO]->(:Pelicula) RETURN count(r) AS total",
  },
  {
    name: "REPRODUCIO (Episodio)",
    sql: "SELECT COUNT(*)::int AS total FROM historial_episodio",
    cypher:
      "MATCH (:Historial)-[r:REPRODUCIO]->(:Episodio) RETURN count(r) AS total",
  },
  {
    name: "REALIZO_CALIFICACION",
    sql: "SELECT COUNT(*)::int AS total FROM calificacion",
    cypher:
      "MATCH (:Usuario)-[r:REALIZO_CALIFICACION]->(:Calificacion) RETURN count(r) AS total",
  },
  {
    name: "CALIFICO (Pelicula)",
    sql: "SELECT COUNT(*)::int AS total FROM calificacion_pelicula",
    cypher:
      "MATCH (:Calificacion)-[r:CALIFICO]->(:Pelicula) RETURN count(r) AS total",
  },
  {
    name: "CALIFICO (Episodio)",
    sql: "SELECT COUNT(*)::int AS total FROM calificacion_episodio",
    cypher:
      "MATCH (:Calificacion)-[r:CALIFICO]->(:Episodio) RETURN count(r) AS total",
  },
];

async function getSqlTotal(sql) {
  const result = await pool.query(sql);
  return Number(result.rows[0].total || 0);
}

async function getCypherTotal(cypher) {
  const rows = await runCypher(cypher);
  return Number(rows[0]?.total || 0);
}

function printResult(kind, name, sqlTotal, cypherTotal) {
  const ok = sqlTotal === cypherTotal;
  const icon = ok ? "✔" : "✖";
  console.log(
    `${icon} [${kind}] ${name} | PG=${sqlTotal} Neo4j=${cypherTotal}`,
  );
  return ok;
}

async function main() {
  console.log("Reconciliando PostgreSQL vs Neo4j...");
  let allOk = true;

  for (const check of NODE_CHECKS) {
    const [sqlTotal, cypherTotal] = await Promise.all([
      getSqlTotal(check.sql),
      getCypherTotal(check.cypher),
    ]);
    if (!printResult("NODO", check.name, sqlTotal, cypherTotal)) {
      allOk = false;
    }
  }

  for (const check of REL_CHECKS) {
    const [sqlTotal, cypherTotal] = await Promise.all([
      getSqlTotal(check.sql),
      getCypherTotal(check.cypher),
    ]);
    if (!printResult("REL", check.name, sqlTotal, cypherTotal)) {
      allOk = false;
    }
  }

  await pool.end();
  await closeNeo4jDriver();

  if (!allOk) {
    console.error("Reconciliación con diferencias detectadas.");
    process.exit(1);
  }

  console.log("Reconciliación OK.");
}

main().catch(async (error) => {
  console.error("Error en reconciliación:", error.message);
  try {
    await pool.end();
  } catch {
    // ignore
  }
  try {
    await closeNeo4jDriver();
  } catch {
    // ignore
  }
  process.exit(1);
});
