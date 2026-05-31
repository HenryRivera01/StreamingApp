const pool = require("../config/db");
const { runCypher } = require("../config/neo4j");
const { isNeo4jUsersEnabled } = require("../config/migrationFlags");

async function findByEmail(correo) {
  if (isNeo4jUsersEnabled()) {
    const rows = await runCypher(
      `
      MATCH (u:Usuario {correo: $correo})
      RETURN {
        id_usuario: u.id_usuario,
        nombre_completo: u.nombre_completo,
        correo: u.correo,
        contrasena_hash: coalesce(u.contrasena_hash, u.contrasena),
        contrasena: coalesce(u.contrasena_hash, u.contrasena),
        pais: u.pais,
        fecha_registro: u.fecha_registro,
        estado_cuenta: u.estado_cuenta,
        rol: coalesce(u.rol, 'USER')
      } AS user
      LIMIT 1
      `,
      { correo },
    );
    return rows[0] ? rows[0].user : undefined;
  }

  const { rows } = await pool.query("SELECT * FROM usuario WHERE correo = $1", [
    correo,
  ]);
  return rows[0];
}

async function findById(id) {
  if (isNeo4jUsersEnabled()) {
    const rows = await runCypher(
      `
      MATCH (u:Usuario {id_usuario: $id})
      RETURN {
        id_usuario: u.id_usuario,
        nombre_completo: u.nombre_completo,
        correo: u.correo,
        contrasena_hash: coalesce(u.contrasena_hash, u.contrasena),
        contrasena: coalesce(u.contrasena_hash, u.contrasena),
        pais: u.pais,
        fecha_registro: u.fecha_registro,
        estado_cuenta: u.estado_cuenta,
        rol: coalesce(u.rol, 'USER')
      } AS user
      LIMIT 1
      `,
      { id: Number(id) },
    );
    return rows[0] ? rows[0].user : undefined;
  }

  const { rows } = await pool.query(
    "SELECT * FROM usuario WHERE id_usuario = $1",
    [id],
  );
  return rows[0];
}

async function createUser({
  nombre_completo,
  correo,
  contrasena_hash,
  pais,
  rol = "USER",
}) {
  if (isNeo4jUsersEnabled()) {
    const rows = await runCypher(
      `
      OPTIONAL MATCH (u:Usuario)
      WITH coalesce(max(u.id_usuario), 0) + 1 AS next_id
      CREATE (newUser:Usuario {
        id_usuario: next_id,
        nombre_completo: $nombre_completo,
        correo: $correo,
        contrasena_hash: $contrasena_hash,
        pais: $pais,
        fecha_registro: date(),
        estado_cuenta: 'ACTIVA',
        rol: $rol
      })
      RETURN {
        id_usuario: newUser.id_usuario,
        nombre_completo: newUser.nombre_completo,
        correo: newUser.correo,
        contrasena_hash: newUser.contrasena_hash,
        contrasena: newUser.contrasena_hash,
        pais: newUser.pais,
        fecha_registro: newUser.fecha_registro,
        estado_cuenta: newUser.estado_cuenta,
        rol: coalesce(newUser.rol, 'USER')
      } AS user
      `,
      { nombre_completo, correo, contrasena_hash, pais, rol },
    );
    return rows[0] ? rows[0].user : undefined;
  }

  const { rows } = await pool.query(
    `INSERT INTO usuario (id_usuario, nombre_completo, correo, contrasena, pais, fecha_registro, estado_cuenta, rol)
     VALUES ((SELECT COALESCE(MAX(id_usuario)+1,1) FROM usuario), $1,$2,$3,$4, NOW(), 'ACTIVA', $5)
     RETURNING *`,
    [nombre_completo, correo, contrasena_hash, pais, rol],
  );
  return rows[0];
}

async function listUsers() {
  if (isNeo4jUsersEnabled()) {
    const rows = await runCypher(
      `
      MATCH (u:Usuario)
      RETURN {
        id_usuario: u.id_usuario,
        nombre_completo: u.nombre_completo,
        correo: u.correo,
        pais: u.pais,
        fecha_registro: u.fecha_registro,
        estado_cuenta: u.estado_cuenta,
        rol: coalesce(u.rol, 'USER')
      } AS user
      ORDER BY u.id_usuario
      `,
    );

    return rows.map((r) => r.user);
  }

  const { rows } = await pool.query(
    "SELECT id_usuario, nombre_completo, correo, pais, fecha_registro, estado_cuenta, rol FROM usuario ORDER BY id_usuario",
  );
  return rows;
}

module.exports = { findByEmail, findById, createUser, listUsers };
