const path = require("path");
const { spawnSync } = require("child_process");

const ALLOWED_PHASES = [
  "media",
  "media-users",
  "media-users-admin",
  "all-neo4j",
];

function getArgValue(flag) {
  const index = process.argv.indexOf(flag);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

function hasFlag(flag) {
  return process.argv.includes(flag);
}

function parseArgs() {
  if (hasFlag("--help") || hasFlag("-h")) {
    return { help: true };
  }

  const phase = getArgValue("--phase") || process.argv[2];
  if (!phase || !ALLOWED_PHASES.includes(phase)) {
    throw new Error(
      `Fase inválida. Usa una de: ${ALLOWED_PHASES.join(", ")}. Ejemplo: npm run cutover:pipeline -- --phase media`,
    );
  }

  return {
    help: false,
    phase,
    skipApply: hasFlag("--skip-apply"),
    skipSmoke: hasFlag("--skip-smoke"),
    skipReconcile: hasFlag("--skip-reconcile"),
    rollbackOnFail: !hasFlag("--no-rollback-on-fail"),
  };
}

function printHelp() {
  console.log("Uso:");
  console.log(
    "  npm run cutover:pipeline -- --phase <media|media-users|media-users-admin|all-neo4j>",
  );
  console.log("");
  console.log("Opciones:");
  console.log("  --skip-apply         No aplica fase en .env");
  console.log("  --skip-smoke         Omite smoke tests");
  console.log("  --skip-reconcile     Omite reconciliación");
  console.log("  --no-rollback-on-fail  No ejecutar rollback automático");
  console.log("");
  console.log("Variables relevantes:");
  console.log("  SMOKE_BASE_URL, SMOKE_EMAIL, SMOKE_PASSWORD");
  console.log("  SMOKE_ADMIN_EMAIL, SMOKE_ADMIN_PASSWORD");
}

function runNodeScript(scriptRelativePath, args = []) {
  const scriptPath = path.resolve(process.cwd(), scriptRelativePath);
  const result = spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: process.cwd(),
    env: process.env,
    encoding: "utf8",
  });

  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);

  return {
    ok: result.status === 0,
    status: result.status,
    stdout: result.stdout || "",
  };
}

function extractSnapshotPath(output) {
  const match = output.match(/Snapshot guardado en:\s*(.+)/);
  return match ? match[1].trim() : null;
}

function fail(message) {
  console.error(`Pipeline failed: ${message}`);
  process.exit(1);
}

function main() {
  const options = parseArgs();

  if (options.help) {
    printHelp();
    process.exit(0);
  }

  console.log(`Iniciando cutover pipeline para fase=${options.phase}`);

  let rollbackSnapshot = null;

  if (!options.skipApply) {
    console.log("\n[1/3] Aplicando fase...");
    const result = runNodeScript("scripts/neo4j/cutover_flags.js", [
      "apply",
      options.phase,
    ]);
    if (!result.ok) {
      fail("falló la aplicación de fase");
    }
    rollbackSnapshot = extractSnapshotPath(result.stdout);
  } else {
    console.log("\n[1/3] Apply omitido (--skip-apply)");
  }

  try {
    if (!options.skipSmoke) {
      console.log("\n[2/3] Ejecutando smoke tests...");
      const smokeResult = runNodeScript("scripts/neo4j/smoke_cutover.js", [
        "--phase",
        options.phase,
      ]);
      if (!smokeResult.ok) {
        throw new Error("smoke tests fallaron");
      }
    } else {
      console.log("\n[2/3] Smoke omitido (--skip-smoke)");
    }

    if (!options.skipReconcile) {
      console.log("\n[3/3] Ejecutando reconciliación...");
      const reconcileResult = runNodeScript(
        "scripts/neo4j/reconcile_pg_neo4j.js",
        [],
      );
      if (!reconcileResult.ok) {
        throw new Error("reconciliación falló");
      }
    } else {
      console.log("\n[3/3] Reconciliación omitida (--skip-reconcile)");
    }
  } catch (error) {
    if (options.rollbackOnFail && rollbackSnapshot) {
      console.log(
        `\nError detectado, ejecutando rollback automático con snapshot: ${rollbackSnapshot}`,
      );
      const rollbackResult = runNodeScript("scripts/neo4j/cutover_flags.js", [
        "rollback",
        rollbackSnapshot,
      ]);
      if (!rollbackResult.ok) {
        fail(`${error.message}. Además falló rollback automático`);
      }
      fail(`${error.message}. Rollback aplicado correctamente`);
    }

    fail(error.message);
  }

  console.log("\nPipeline completado correctamente.");
}

try {
  main();
} catch (error) {
  fail(error.message);
}
