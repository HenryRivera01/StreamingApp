const dotenv = require("dotenv");
const {
  isNeo4jUsersEnabled,
  isNeo4jMediaEnabled,
  isNeo4jAdminEnabled,
  isNeo4jUploadsEnabled,
} = require("./migrationFlags");

dotenv.config();

const explicitFlag = process.env.POSTGRES_ENABLED;
const allNeo4jEnabled =
  isNeo4jUsersEnabled() &&
  isNeo4jMediaEnabled() &&
  isNeo4jAdminEnabled() &&
  isNeo4jUploadsEnabled();

const usePostgres =
  explicitFlag !== undefined
    ? String(explicitFlag).toLowerCase() === "true"
    : !allNeo4jEnabled;

let pool;

function getPool() {
  if (!pool) {
    const { Pool } = require("pg");
    pool = new Pool({
      host: process.env.PGHOST,
      port: process.env.PGPORT,
      user: process.env.PGUSER,
      password: process.env.PGPASSWORD,
      database: process.env.PGDATABASE,
    });
  }
  return pool;
}

function createDisabledPool() {
  const message =
    "PostgreSQL esta deshabilitado. Activa POSTGRES_ENABLED=true si necesitas SQL.";
  return {
    query: async () => {
      throw new Error(message);
    },
    connect: async () => {
      throw new Error(message);
    },
  };
}

async function initDb() {
  if (!usePostgres) return;
  const alterSql =
    "ALTER TABLE IF EXISTS usuario ADD COLUMN IF NOT EXISTS rol VARCHAR(20) DEFAULT 'USER';";
  await getPool().query(alterSql);
}

initDb().catch((err) => {
  console.error("Error inicializando base de datos", err);
});

module.exports = usePostgres ? getPool() : createDisabledPool();
