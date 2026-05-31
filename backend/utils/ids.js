
/*const pool = require('../config/db');

async function nextId(table, idColumn) {
  const query = `
    SELECT COALESCE(MAX(${idColumn}), 0) + 1 AS next_id
    FROM ${table}
  `;
  const { rows } = await pool.query(query);
  return rows[0].next_id;
}

module.exports = { nextId };*/


async function nextId(client, table, idColumn) {
  const query = `
    SELECT COALESCE(MAX(${idColumn}), 0) + 1 AS next_id
    FROM ${table}
  `;

  const { rows } = await client.query(query);
  return rows[0].next_id;
}

module.exports = { nextId };