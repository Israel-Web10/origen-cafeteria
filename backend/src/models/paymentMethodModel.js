const { pool } = require('../config/db');

function parseRow(row) {
  if (!row) return row;
  return { ...row, config: typeof row.config === 'string' ? JSON.parse(row.config) : row.config };
}

async function list({ onlyActive = false } = {}) {
  let sql = 'SELECT * FROM payment_methods';
  if (onlyActive) sql += ' WHERE active = TRUE';
  sql += ' ORDER BY id ASC';
  const [rows] = await pool.query(sql);
  return rows.map(parseRow);
}

async function findById(id) {
  const [rows] = await pool.query('SELECT * FROM payment_methods WHERE id = ? LIMIT 1', [id]);
  return parseRow(rows[0]) || null;
}

async function create({ type, name, active = true, config = {} }) {
  const [result] = await pool.query(
    'INSERT INTO payment_methods (type, name, active, config) VALUES (?, ?, ?, ?)',
    [type, name, active, JSON.stringify(config)]
  );
  return findById(result.insertId);
}

async function update(id, fields) {
  const sets = [];
  const params = [];
  if (fields.name !== undefined) { sets.push('name = ?'); params.push(fields.name); }
  if (fields.active !== undefined) { sets.push('active = ?'); params.push(fields.active); }
  if (fields.config !== undefined) { sets.push('config = ?'); params.push(JSON.stringify(fields.config)); }
  if (sets.length === 0) return findById(id);
  params.push(id);
  await pool.query(`UPDATE payment_methods SET ${sets.join(', ')} WHERE id = ?`, params);
  return findById(id);
}

module.exports = { list, findById, create, update };
