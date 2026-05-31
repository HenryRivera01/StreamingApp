const pool = require("../config/db");
const { runCypher } = require("../config/neo4j");
const { isNeo4jAdminEnabled } = require("../config/migrationFlags");

async function getDashboardStats(req, res) {
  try {
    if (isNeo4jAdminEnabled()) {
      const [
        usuariosRows,
        peliculasRows,
        seriesRows,
        masVistoPeliculas,
        masVistoEpisodios,
        actividadReciente,
      ] = await Promise.all([
        runCypher("MATCH (u:Usuario) RETURN count(u) AS total"),
        runCypher("MATCH (p:Pelicula) RETURN count(p) AS total"),
        runCypher("MATCH (s:Serie) RETURN count(s) AS total"),
        runCypher(`
            MATCH (h:Historial)-[:REPRODUCIO]->(p:Pelicula)
            RETURN p.id_pelicula AS id_pelicula, p.titulo AS titulo, count(h) AS reproducciones
            ORDER BY reproducciones DESC, titulo ASC
            LIMIT 10
          `),
        runCypher(`
            MATCH (h:Historial)-[:REPRODUCIO]->(e:Episodio)
            RETURN e.id_episodio AS id_episodio, e.titulo AS titulo, count(h) AS reproducciones
            ORDER BY reproducciones DESC, titulo ASC
            LIMIT 10
          `),
        runCypher(`
            MATCH (u:Usuario)-[:TIENE_HISTORIAL]->(h:Historial)
            OPTIONAL MATCH (h)-[:CON_ESTADO]->(er:EstadoReproduccion)
            RETURN
              h.id_historial AS id_historial,
              u.correo AS correo,
              h.fecha_reproduccion AS fecha_reproduccion,
              h.tiempo_reproducido AS tiempo_reproducido,
              er.tipo_estado AS tipo_estado
            ORDER BY h.fecha_reproduccion DESC, h.id_historial DESC
            LIMIT 20
          `),
      ]);

      return res.json({
        total_usuarios: usuariosRows[0]?.total || 0,
        total_peliculas: peliculasRows[0]?.total || 0,
        total_series: seriesRows[0]?.total || 0,
        mas_visto_peliculas: masVistoPeliculas,
        mas_visto_episodios: masVistoEpisodios,
        actividad_reciente: actividadReciente,
      });
    }

    const [
      usuarios,
      peliculas,
      series,
      masVistoPeliculas,
      masVistoEpisodios,
      actividadReciente,
    ] = await Promise.all([
      pool.query("SELECT COUNT(*)::int AS total FROM usuario"),
      pool.query("SELECT COUNT(*)::int AS total FROM pelicula"),
      pool.query("SELECT COUNT(*)::int AS total FROM serie"),
      pool.query(`
        SELECT
          p.id_pelicula,
          p.titulo,
          COUNT(*)::int AS reproducciones
        FROM historial h
        JOIN historial_pelicula hp
          ON h.id_historial = hp.id_historial
        JOIN pelicula p
          ON hp.id_pelicula = p.id_pelicula
        GROUP BY p.id_pelicula, p.titulo
        ORDER BY reproducciones DESC, p.titulo ASC
        LIMIT 10
      `),
      pool.query(`
        SELECT
          e.id_episodio,
          e.titulo,
          COUNT(*)::int AS reproducciones
        FROM historial h
        JOIN historial_episodio he
          ON h.id_historial = he.id_historial
        JOIN episodio e
          ON he.id_episodio = e.id_episodio
        GROUP BY e.id_episodio, e.titulo
        ORDER BY reproducciones DESC, e.titulo ASC
        LIMIT 10
      `),
      pool.query(`
        SELECT
          h.id_historial,
          u.correo,
          h.fecha_reproduccion,
          h.tiempo_reproducido,
          er.tipo_estado
        FROM historial h
        LEFT JOIN usuario u
          ON h.id_usuario = u.id_usuario
        LEFT JOIN estado_reproduccion er
          ON h.id_estado = er.id_estado
        ORDER BY h.fecha_reproduccion DESC, h.id_historial DESC
        LIMIT 20
      `),
    ]);

    return res.json({
      total_usuarios: usuarios.rows[0]?.total || 0,
      total_peliculas: peliculas.rows[0]?.total || 0,
      total_series: series.rows[0]?.total || 0,
      mas_visto_peliculas: masVistoPeliculas.rows,
      mas_visto_episodios: masVistoEpisodios.rows,
      actividad_reciente: actividadReciente.rows,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      message: "Error obteniendo estadísticas",
      error: err.message,
    });
  }
}

async function runReadonlyQuery(req, res) {
  try {
    const { sql } = req.body;

    if (!sql || typeof sql !== "string") {
      return res.status(400).json({ message: "SQL requerida" });
    }

    const trimmed = sql.trim().replace(/\s+/g, " ").toLowerCase();

    if (!trimmed.startsWith("select")) {
      return res.status(400).json({
        message: "Solo se permiten consultas SELECT",
      });
    }

    const forbidden = [
      "insert ",
      "update ",
      "delete ",
      "drop ",
      "alter ",
      "truncate ",
      "create ",
    ];
    const hasForbidden = forbidden.some((word) => trimmed.includes(word));

    if (hasForbidden) {
      return res.status(403).json({
        message: "Consulta no permitida",
      });
    }

    const result = await pool.query(sql);

    return res.json({
      rows: result.rows,
      fields: result.fields.map((f) => f.name),
      rowCount: result.rowCount,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      message: "Error ejecutando consulta",
      error: err.message,
    });
  }
}

async function listUsers(req, res) {
  try {
    if (isNeo4jAdminEnabled()) {
      const rows = await runCypher(`
        MATCH (u:Usuario)
        RETURN
          u.id_usuario AS id_usuario,
          u.nombre_completo AS nombre_completo,
          u.correo AS correo,
          u.pais AS pais,
          u.fecha_registro AS fecha_registro,
          u.estado_cuenta AS estado_cuenta,
          u.rol AS rol
        ORDER BY u.id_usuario ASC
      `);

      return res.json({ rows });
    }

    const result = await pool.query(`
      SELECT
        id_usuario,
        nombre_completo,
        correo,
        pais,
        fecha_registro,
        estado_cuenta,
        rol
      FROM usuario
      ORDER BY id_usuario ASC
    `);

    return res.json({ rows: result.rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      message: "Error obteniendo usuarios",
      error: err.message,
    });
  }
}

async function advancedQueries(req, res) {
  try {
    if (isNeo4jAdminEnabled()) {
      const [porGenero, promedioDuracionRows, topActivos] = await Promise.all([
        runCypher(`
          MATCH (p:Pelicula)-[:TIENE_GENERO]->(g:Genero)
          RETURN g.nombre_genero AS nombre_genero, count(p) AS total
          ORDER BY total DESC, nombre_genero ASC
        `),
        runCypher(`
          MATCH (p:Pelicula)
          WHERE p.duracion_minutos IS NOT NULL
          RETURN
            avg(toFloat(p.duracion_minutos)) AS promedio_peliculas,
            max(p.duracion_minutos) AS max_pelicula,
            min(p.duracion_minutos) AS min_pelicula
        `),
        runCypher(`
          MATCH (u:Usuario)-[:TIENE_HISTORIAL]->(h:Historial)
          WITH u, count(h) AS total_repros
          WHERE total_repros >= 5
          RETURN u.id_usuario AS id_usuario, u.correo AS correo, total_repros
          ORDER BY total_repros DESC, correo ASC
        `),
      ]);

      const promedioDuracion = promedioDuracionRows[0] || {
        promedio_peliculas: null,
        max_pelicula: null,
        min_pelicula: null,
      };

      return res.json({
        contenido_por_genero: porGenero,
        duracion_peliculas: promedioDuracion,
        usuarios_mas_activos: topActivos,
      });
    }

    const [porGenero, promedioDuracion, topActivos] = await Promise.all([
      // GROUP BY, JOIN, COUNT, HAVING
      pool.query(`
        SELECT
          g.nombre_genero,
          COUNT(pg.id_pelicula)::int AS total
        FROM genero g
        LEFT JOIN pelicula_genero pg
          ON g.id_genero = pg.id_genero
        GROUP BY g.id_genero, g.nombre_genero
        HAVING COUNT(pg.id_pelicula) > 0
        ORDER BY total DESC, g.nombre_genero ASC
      `),

      // AVG, MAX, MIN
      pool.query(`
        SELECT
          AVG(p.duracion_minutos)::numeric(10,2) AS promedio_peliculas,
          MAX(p.duracion_minutos) AS max_pelicula,
          MIN(p.duracion_minutos) AS min_pelicula
        FROM pelicula p
        WHERE p.duracion_minutos IS NOT NULL
      `),

      // Subconsulta: usuarios con más de X reproducciones
      pool.query(`
        SELECT
          u.id_usuario,
          u.correo,
          stats.total_repros
        FROM usuario u
        JOIN (
          SELECT
            h.id_usuario,
            COUNT(*)::int AS total_repros
          FROM historial h
          WHERE h.id_usuario IS NOT NULL
          GROUP BY h.id_usuario
        ) stats
          ON u.id_usuario = stats.id_usuario
        WHERE stats.total_repros >= 5
        ORDER BY stats.total_repros DESC, u.correo ASC
      `),
    ]);

    return res.json({
      contenido_por_genero: porGenero.rows,
      duracion_peliculas: promedioDuracion.rows[0],
      usuarios_mas_activos: topActivos.rows,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      message: "Error en consultas avanzadas",
      error: err.message,
    });
  }
}

module.exports = {
  getDashboardStats,
  listUsers,
  runReadonlyQuery,
  advancedQueries,
};
