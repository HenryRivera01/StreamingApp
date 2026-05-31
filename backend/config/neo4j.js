const dotenv = require("dotenv");

dotenv.config();

let driver;
let neo4j;

function getNeo4jLib() {
  if (!neo4j) {
    neo4j = require("neo4j-driver");
  }
  return neo4j;
}

function getDriver() {
  if (driver) return driver;

  const uri = process.env.NEO4J_URI;
  const user = process.env.NEO4J_USER;
  const password = process.env.NEO4J_PASSWORD;

  if (!uri || !user || !password) {
    throw new Error(
      "Configura NEO4J_URI, NEO4J_USER y NEO4J_PASSWORD para habilitar Neo4j",
    );
  }

  const lib = getNeo4jLib();
  driver = lib.driver(uri, lib.auth.basic(user, password));
  return driver;
}

function normalizeValue(value) {
  const lib = getNeo4jLib();

  if (lib.isInt(value)) {
    return value.toNumber();
  }

  if (
    typeof value === "number" &&
    Number.isFinite(value) &&
    Number.isInteger(value)
  ) {
    return value;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    const rounded = Math.round(value);
    if (Math.abs(value - rounded) < 1e-9) {
      return rounded;
    }
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(normalizeValue);
  }

  if (value && typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = normalizeValue(v);
    }
    return out;
  }

  return value;
}

async function runCypher(query, params = {}) {
  const session = getDriver().session({
    database: process.env.NEO4J_DATABASE || undefined,
  });

  try {
    const result = await session.run(query, params);
    return result.records.map((record) => {
      const row = {};
      for (const key of record.keys) {
        row[key] = normalizeValue(record.get(key));
      }
      return row;
    });
  } finally {
    await session.close();
  }
}

async function closeNeo4jDriver() {
  if (driver) {
    await driver.close();
    driver = null;
  }
}

module.exports = {
  runCypher,
  closeNeo4jDriver,
};
