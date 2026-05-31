const axios = require("axios");

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

function readPhase() {
  const argPhase = getArgValue("--phase") || process.argv[2];
  if (!argPhase || !ALLOWED_PHASES.includes(argPhase)) {
    throw new Error(
      `Fase inválida. Usa una de: ${ALLOWED_PHASES.join(", ")}. Ejemplo: npm run smoke:cutover -- --phase media`,
    );
  }
  return argPhase;
}

function createClient(baseURL) {
  return axios.create({
    baseURL,
    timeout: 15000,
    validateStatus: () => true,
  });
}

function assertStatus(response, expectedStatuses, context) {
  if (!expectedStatuses.includes(response.status)) {
    const body =
      typeof response.data === "string"
        ? response.data.slice(0, 300)
        : JSON.stringify(response.data).slice(0, 300);
    throw new Error(
      `${context} -> status ${response.status}, esperado ${expectedStatuses.join("/")}. Body: ${body}`,
    );
  }
}

async function login(client, correo, contrasena, label) {
  const response = await client.post("/api/auth/login", { correo, contrasena });
  assertStatus(response, [200], `Login (${label})`);

  const token = response.data?.token;
  if (!token) {
    throw new Error(`Login (${label}) sin token en respuesta`);
  }

  const user = response.data?.user || null;
  return { token, user };
}

async function registerAndLoginEphemeralUser(client) {
  const unique = `smoke_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
  const correo = `${unique}@example.local`;
  const contrasena = "SmokePass123!";

  const registerResponse = await client.post("/api/auth/register", {
    nombre_completo: "Smoke User",
    correo,
    contrasena,
    pais: "CO",
  });

  assertStatus(registerResponse, [201], "Register usuario temporal");

  const token = registerResponse.data?.token;
  if (!token) {
    throw new Error("Register usuario temporal sin token");
  }

  return {
    token,
    user: registerResponse.data?.user || null,
    correo,
    contrasena,
  };
}

async function getStandardToken(client) {
  const correo = process.env.SMOKE_EMAIL;
  const contrasena = process.env.SMOKE_PASSWORD;

  if (correo && contrasena) {
    return login(client, correo, contrasena, "SMOKE_EMAIL");
  }

  return registerAndLoginEphemeralUser(client);
}

async function getAdminToken(client) {
  const correo = process.env.SMOKE_ADMIN_EMAIL || process.env.SMOKE_EMAIL;
  const contrasena =
    process.env.SMOKE_ADMIN_PASSWORD || process.env.SMOKE_PASSWORD;

  if (!correo || !contrasena) {
    throw new Error(
      "Fase admin requiere SMOKE_ADMIN_EMAIL/SMOKE_ADMIN_PASSWORD (o SMOKE_EMAIL/SMOKE_PASSWORD con usuario ADMIN)",
    );
  }

  const result = await login(client, correo, contrasena, "ADMIN");
  if (!result.user || result.user.rol !== "ADMIN") {
    throw new Error(
      `Usuario autenticado no es ADMIN (rol=${result.user?.rol || "desconocido"})`,
    );
  }
  return result;
}

async function requestGet(client, url, token, context) {
  const response = await client.get(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assertStatus(response, [200], context);
  return response.data;
}

async function runMediaChecks(client, token) {
  const movies = await requestGet(
    client,
    "/api/media/movies",
    token,
    "GET /api/media/movies",
  );
  const series = await requestGet(
    client,
    "/api/media/series",
    token,
    "GET /api/media/series",
  );

  if (Array.isArray(movies) && movies.length > 0 && movies[0]?.id_pelicula) {
    await requestGet(
      client,
      `/api/media/movies/${movies[0].id_pelicula}`,
      token,
      "GET /api/media/movies/:id",
    );
  }

  if (Array.isArray(series) && series.length > 0 && series[0]?.id_serie) {
    await requestGet(
      client,
      `/api/media/series/${series[0].id_serie}/episodes`,
      token,
      "GET /api/media/series/:id/episodes",
    );
  }
}

async function runAdminChecks(client, adminToken) {
  await requestGet(
    client,
    "/api/admin/dashboard",
    adminToken,
    "GET /api/admin/dashboard",
  );
  await requestGet(
    client,
    "/api/admin/advanced-queries",
    adminToken,
    "GET /api/admin/advanced-queries",
  );
}

async function runUploadReadChecks(client, adminToken) {
  await requestGet(
    client,
    "/api/media/upload-form-data",
    adminToken,
    "GET /api/media/upload-form-data",
  );
}

async function main() {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    console.log(
      "Uso: npm run smoke:cutover -- --phase <media|media-users|media-users-admin|all-neo4j>",
    );
    console.log("Variables opcionales:");
    console.log("- SMOKE_BASE_URL (default: http://localhost:4000)");
    console.log("- SMOKE_EMAIL, SMOKE_PASSWORD");
    console.log("- SMOKE_ADMIN_EMAIL, SMOKE_ADMIN_PASSWORD");
    process.exit(0);
  }

  const phase = readPhase();
  const baseURL = process.env.SMOKE_BASE_URL || "http://localhost:4000";
  const client = createClient(baseURL);

  console.log(`Ejecutando smoke cutover fase=${phase} baseURL=${baseURL}`);

  const standardAuth = await getStandardToken(client);
  await runMediaChecks(client, standardAuth.token);
  console.log("✔ Checks media OK");

  if (phase === "media") {
    console.log("Smoke finalizado (fase media)");
    return;
  }

  if (phase === "media-users") {
    console.log("✔ Checks users/auth OK");
    console.log("Smoke finalizado (fase media-users)");
    return;
  }

  const adminAuth = await getAdminToken(client);
  await runAdminChecks(client, adminAuth.token);
  console.log("✔ Checks admin OK");

  if (phase === "media-users-admin") {
    console.log("Smoke finalizado (fase media-users-admin)");
    return;
  }

  await runUploadReadChecks(client, adminAuth.token);
  console.log("✔ Checks uploads(read) OK");
  console.log("Smoke finalizado (fase all-neo4j)");
}

main().catch((error) => {
  console.error(`Smoke failed: ${error.message}`);
  process.exit(1);
});
