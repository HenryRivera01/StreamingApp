/*
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { runCypher } = require('../config/neo4j');
const { isNeo4jUploadsEnabled } = require('../config/migrationFlags');
const { authMiddleware, adminMiddleware } = require('../middleware/authMiddleware');

// Devuelve catálogos necesarios para los formularios de subida
// GET /api/media/upload-form-data
router.get(
    '/upload-form-data',
    authMiddleware,
    adminMiddleware,
    async (req, res) => {
        try {
            const [distribuidores, generos, series] = await Promise.all([
                pool.query(
                    'SELECT id_distribuidor, nombre FROM distribuidor ORDER BY nombre'
                ),
                pool.query(
                    'SELECT id_genero, nombre_genero FROM genero ORDER BY nombre_genero'
                ),
                pool.query(
                    'SELECT id_serie, titulo FROM serie ORDER BY titulo'
                ),
            ]);

            return res.json({
                distribuidores: distribuidores.rows,
                generos: generos.rows,
                series: series.rows,
            });
        } catch (err) {
            console.error('Error en /api/media/upload-form-data', err);
            return res
                .status(500)
                .json({ message: 'Error cargando catálogos para subida' });
        }
    }
);

module.exports = router;*/

const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const { runCypher } = require("../config/neo4j");
const { isNeo4jUploadsEnabled } = require("../config/migrationFlags");
const {
  authMiddleware,
  adminMiddleware,
} = require("../middleware/authMiddleware");

// Devuelve catálogos necesarios para los formularios de subida
// GET /api/media/upload-form-data
router.get(
  "/upload-form-data",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      if (isNeo4jUploadsEnabled()) {
        const [distribuidores, generos, series] = await Promise.all([
          runCypher(`
            MATCH (d:Distribuidor)
            RETURN d.id_distribuidor AS id_distribuidor, d.nombre AS nombre
            ORDER BY nombre ASC
          `),
          runCypher(`
            MATCH (g:Genero)
            RETURN g.id_genero AS id_genero, g.nombre_genero AS nombre_genero
            ORDER BY nombre_genero ASC
          `),
          runCypher(`
            MATCH (s:Serie)
            RETURN s.id_serie AS id_serie, s.titulo AS titulo
            ORDER BY titulo ASC
          `),
        ]);

        return res.json({
          distribuidores,
          generos,
          series,
        });
      }

      const distribuidoresQuery = `
        SELECT
          id_distribuidor,
          nombre
        FROM distribuidor
        ORDER BY nombre ASC
      `;

      const generosQuery = `
        SELECT
          id_genero,
          nombre_genero
        FROM genero
        ORDER BY nombre_genero ASC
      `;

      const seriesQuery = `
        SELECT
          id_serie,
          titulo
        FROM serie
        ORDER BY titulo ASC
      `;

      const [distribuidoresResult, generosResult, seriesResult] =
        await Promise.all([
          pool.query(distribuidoresQuery),
          pool.query(generosQuery),
          pool.query(seriesQuery),
        ]);

      return res.json({
        distribuidores: distribuidoresResult.rows,
        generos: generosResult.rows,
        series: seriesResult.rows,
      });
    } catch (error) {
      console.error("Error en upload-form-data:", error);
      return res.status(500).json({
        message: "Error cargando datos de formularios",
        error: error.message,
      });
    }
  },
);

module.exports = router;
