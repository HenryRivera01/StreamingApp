const fs = require("fs");
const path = require("path");
const { runCypher } = require("./neo4j");

const DEFAULT_SEED_FILE = path.join(
  __dirname,
  "..",
  "migrations",
  "neo4j",
  "007_reset_and_seed_demo.cypher",
);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function stripComments(cypher) {
  return cypher.replace(/^\s*\/\/.*$/gm, "");
}

function splitStatements(cypher) {
  return stripComments(cypher)
    .split(";")
    .map((stmt) => stmt.trim())
    .filter(Boolean);
}

async function waitForNeo4j({ timeoutMs = 60000, intervalMs = 2000 } = {}) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      await runCypher("RETURN 1 AS ok");
      return;
    } catch (err) {
      await sleep(intervalMs);
    }
  }

  throw new Error("Neo4j no esta listo despues del tiempo de espera");
}

async function isGraphEmpty() {
  const rows = await runCypher("MATCH (n) RETURN count(n) AS total");
  const total = Number(rows[0]?.total || 0);
  return total === 0;
}

async function seedNeo4jIfEmpty() {
  const shouldSeed =
    String(process.env.NEO4J_SEED_ON_START || "").toLowerCase() === "true";
  if (!shouldSeed) return;

  const empty = await isGraphEmpty();
  if (!empty) return;

  const seedFile = process.env.NEO4J_SEED_FILE
    ? path.resolve(process.env.NEO4J_SEED_FILE)
    : DEFAULT_SEED_FILE;

  if (!fs.existsSync(seedFile)) {
    throw new Error(`No se encontro el seed de Neo4j: ${seedFile}`);
  }

  const content = fs.readFileSync(seedFile, "utf8");
  const statements = splitStatements(content);

  console.log(`Neo4j vacio. Ejecutando seed: ${seedFile}`);
  for (const statement of statements) {
    await runCypher(statement);
  }
  console.log("Seed de Neo4j completado");
}

module.exports = {
  waitForNeo4j,
  seedNeo4jIfEmpty,
};
