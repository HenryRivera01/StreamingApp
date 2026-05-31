const fs = require("fs");
const path = require("path");

const ENV_PATH = path.resolve(process.cwd(), ".env");
const SNAPSHOT_DIR = path.resolve(
  process.cwd(),
  "migrations",
  "neo4j",
  "snapshots",
);

const FLAG_KEYS = [
  "NEO4J_USERS_ENABLED",
  "NEO4J_MEDIA_ENABLED",
  "NEO4J_ADMIN_ENABLED",
  "NEO4J_UPLOADS_ENABLED",
];

const PHASES = {
  "sql-only": {
    NEO4J_USERS_ENABLED: false,
    NEO4J_MEDIA_ENABLED: false,
    NEO4J_ADMIN_ENABLED: false,
    NEO4J_UPLOADS_ENABLED: false,
  },
  media: {
    NEO4J_USERS_ENABLED: false,
    NEO4J_MEDIA_ENABLED: true,
    NEO4J_ADMIN_ENABLED: false,
    NEO4J_UPLOADS_ENABLED: false,
  },
  "media-users": {
    NEO4J_USERS_ENABLED: true,
    NEO4J_MEDIA_ENABLED: true,
    NEO4J_ADMIN_ENABLED: false,
    NEO4J_UPLOADS_ENABLED: false,
  },
  "media-users-admin": {
    NEO4J_USERS_ENABLED: true,
    NEO4J_MEDIA_ENABLED: true,
    NEO4J_ADMIN_ENABLED: true,
    NEO4J_UPLOADS_ENABLED: false,
  },
  "all-neo4j": {
    NEO4J_USERS_ENABLED: true,
    NEO4J_MEDIA_ENABLED: true,
    NEO4J_ADMIN_ENABLED: true,
    NEO4J_UPLOADS_ENABLED: true,
  },
};

function timestamp() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  return `${yyyy}${mm}${dd}-${hh}${min}${ss}`;
}

function ensureEnvExists() {
  if (!fs.existsSync(ENV_PATH)) {
    throw new Error(`No existe .env en: ${ENV_PATH}`);
  }
}

function readEnvRaw() {
  ensureEnvExists();
  return fs.readFileSync(ENV_PATH, "utf8");
}

function writeEnvRaw(content) {
  fs.writeFileSync(ENV_PATH, content, "utf8");
}

function createSnapshot(envRaw) {
  fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
  const fileName = `.env.snapshot.${timestamp()}`;
  const fullPath = path.join(SNAPSHOT_DIR, fileName);
  fs.writeFileSync(fullPath, envRaw, "utf8");
  return fullPath;
}

function applyFlagsToEnv(envRaw, flags) {
  const lines = envRaw.split(/\r?\n/);
  const updated = [];
  const seen = new Set();

  for (const line of lines) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=(.*)$/);
    if (!match) {
      updated.push(line);
      continue;
    }

    const key = match[1];
    if (Object.prototype.hasOwnProperty.call(flags, key)) {
      seen.add(key);
      updated.push(`${key}=${flags[key] ? "true" : "false"}`);
      continue;
    }

    updated.push(line);
  }

  for (const key of Object.keys(flags)) {
    if (!seen.has(key)) {
      updated.push(`${key}=${flags[key] ? "true" : "false"}`);
    }
  }

  return `${updated.join("\n").replace(/\n+$/g, "")}\n`;
}

function parseCurrentFlags(envRaw) {
  const result = {};
  for (const key of FLAG_KEYS) {
    const regex = new RegExp(`^\\s*${key}\\s*=\\s*(.+)\\s*$`, "m");
    const match = envRaw.match(regex);
    result[key] = match ? String(match[1]).trim().toLowerCase() : "undefined";
  }
  return result;
}

function printStatus() {
  const envRaw = readEnvRaw();
  const flags = parseCurrentFlags(envRaw);
  console.log("Estado actual de flags Neo4j:");
  for (const key of FLAG_KEYS) {
    console.log(`- ${key}=${flags[key]}`);
  }
}

function printHelp() {
  console.log("Uso:");
  console.log("  node scripts/neo4j/cutover_flags.js status");
  console.log("  node scripts/neo4j/cutover_flags.js list");
  console.log("  node scripts/neo4j/cutover_flags.js apply <fase>");
  console.log("  node scripts/neo4j/cutover_flags.js rollback <ruta_snapshot>");
  console.log("");
  console.log("Fases disponibles:");
  for (const phase of Object.keys(PHASES)) {
    console.log(`- ${phase}`);
  }
}

function applyPhase(phaseName) {
  const flags = PHASES[phaseName];
  if (!flags) {
    throw new Error(`Fase inválida: ${phaseName}`);
  }

  const envRaw = readEnvRaw();
  const snapshotPath = createSnapshot(envRaw);
  const nextEnv = applyFlagsToEnv(envRaw, flags);
  writeEnvRaw(nextEnv);

  console.log(`Fase aplicada: ${phaseName}`);
  console.log(`Snapshot guardado en: ${snapshotPath}`);
  printStatus();
}

function rollback(snapshotPathArg) {
  if (!snapshotPathArg) {
    throw new Error("Debes indicar la ruta del snapshot para rollback");
  }

  const snapshotPath = path.resolve(snapshotPathArg);
  if (!fs.existsSync(snapshotPath)) {
    throw new Error(`Snapshot no encontrado: ${snapshotPath}`);
  }

  const currentEnv = readEnvRaw();
  const currentSnapshotPath = createSnapshot(currentEnv);
  const snapshotContent = fs.readFileSync(snapshotPath, "utf8");
  writeEnvRaw(snapshotContent);

  console.log(`Rollback aplicado desde: ${snapshotPath}`);
  console.log(`Snapshot previo guardado en: ${currentSnapshotPath}`);
  printStatus();
}

function listPhases() {
  console.log("Fases disponibles:");
  for (const [name, flags] of Object.entries(PHASES)) {
    const summary = FLAG_KEYS.map(
      (k) =>
        `${k.replace("NEO4J_", "").replace("_ENABLED", "")}=${flags[k] ? "on" : "off"}`,
    ).join(", ");
    console.log(`- ${name}: ${summary}`);
  }
}

function main() {
  const command = process.argv[2];
  const arg = process.argv[3];

  if (!command) {
    printHelp();
    process.exit(1);
  }

  if (command === "status") {
    printStatus();
    return;
  }

  if (command === "list") {
    listPhases();
    return;
  }

  if (command === "apply") {
    applyPhase(arg);
    return;
  }

  if (command === "rollback") {
    rollback(arg);
    return;
  }

  printHelp();
  process.exit(1);
}

try {
  main();
} catch (error) {
  console.error(`Error: ${error.message}`);
  process.exit(1);
}
