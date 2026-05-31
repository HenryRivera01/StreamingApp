const axios = require("axios");

async function run() {
  const baseUrl = process.env.AUTH_BASE_URL || "http://localhost:4000";
  const password = process.env.AUTH_TEST_PASSWORD || "Pass1234!";
  const correo = `auth_test_${Date.now()}_${Math.floor(Math.random() * 100000)}@example.com`;

  const registerPayload = {
    nombre_completo: "Auth Test User",
    correo,
    contrasena: password,
    pais: "CO",
  };

  const loginPayload = {
    correo,
    contrasena: password,
  };

  try {
    const registerRes = await axios.post(
      `${baseUrl}/api/auth/register`,
      registerPayload,
      {
        headers: { "Content-Type": "application/json" },
        timeout: 15000,
      },
    );

    if (
      registerRes.status !== 201 ||
      !registerRes.data?.token ||
      !registerRes.data?.user?.correo
    ) {
      throw new Error("Respuesta inválida en register");
    }

    const loginRes = await axios.post(
      `${baseUrl}/api/auth/login`,
      loginPayload,
      {
        headers: { "Content-Type": "application/json" },
        timeout: 15000,
      },
    );

    if (
      loginRes.status !== 200 ||
      !loginRes.data?.token ||
      !loginRes.data?.user?.correo
    ) {
      throw new Error("Respuesta inválida en login");
    }

    console.log("AUTH_TEST_OK");
    console.log(`baseUrl=${baseUrl}`);
    console.log(`correo=${correo}`);
    process.exit(0);
  } catch (error) {
    const status = error.response?.status;
    const body = error.response?.data;

    console.error("AUTH_TEST_FAILED");
    console.error(`baseUrl=${baseUrl}`);
    if (status) {
      console.error(`status=${status}`);
    }
    if (body) {
      console.error(`response=${JSON.stringify(body)}`);
    } else {
      console.error(`error=${error.message}`);
    }

    process.exit(1);
  }
}

run();
