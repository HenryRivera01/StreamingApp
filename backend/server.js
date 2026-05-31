const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

dotenv.config();

const authRoutes = require("./routes/authRoutes");
const mediaRoutes = require("./routes/mediaRoutes");
const adminRoutes = require("./routes/adminRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const uploadFormDataRoutes = require("./routes/uploadFormDataRoutes");
const { closeNeo4jDriver } = require("./config/neo4j");
const { waitForNeo4j, seedNeo4jIfEmpty } = require("./config/neo4jBootstrap");
// const { syncAll } = require('./services/mediaScanner');

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// Rutas API

app.use("/api/auth", authRoutes);
app.use("/api/media", mediaRoutes);
app.use("/api/media", uploadRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/media", uploadFormDataRoutes);

// Servir frontend estático si existe (en Docker el frontend no esta incluido)
const frontendPath = process.env.FRONTEND_PATH
  ? path.resolve(process.env.FRONTEND_PATH)
  : path.join(__dirname, "..", "frontend");
if (fs.existsSync(frontendPath)) {
  app.use(express.static(frontendPath));

  app.get("/", (req, res) => {
    res.sendFile(path.join(frontendPath, "index.html"));
  });
} else {
  app.get("/", (req, res) => {
    res.json({
      message:
        "Backend activo. El frontend no esta incluido en este contenedor.",
    });
  });
}

// Sincronización inicial de media
// syncAll().catch(err => console.error('Error sincronizando media', err));

const PORT = process.env.PORT || 4000;

async function startServer() {
  try {
    await waitForNeo4j();
    await seedNeo4jIfEmpty();

    app.listen(PORT, () => {
      console.log(`Servidor escuchando en puerto ${PORT}`);
    });
  } catch (err) {
    console.error("Error iniciando servidor", err);
    process.exit(1);
  }
}

startServer();

async function shutdown(signal) {
  try {
    console.log(`Cerrando servidor por ${signal}...`);
    await closeNeo4jDriver();
  } catch (err) {
    console.error("Error cerrando driver Neo4j", err);
  } finally {
    process.exit(0);
  }
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
