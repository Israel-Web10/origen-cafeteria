const { pool } = require('../config/db');

async function list({ onlyActive = false } = {}) {
  let sql = 'SELECT * FROM categories';
  if (onlyActive) sql += ' WHERE active = TRUE';
  sql += ' ORDER BY display_order ASC, name ASC';
  const [rows] = await pool.query(sql);
  return rows;
}

async function findById(id) {
  const [rows] = await pool.query('SELECT * FROM categories WHERE id = ? LIMIT 1', [id]);
  return rows[0] || null;
}

async function create({ name, description, display_order = 0, active = true }) {
  const [result] = await pool.query(
    'INSERT INTO categories (name, description, display_order, active) VALUES (?, ?, ?, ?)',
    [name, description || null, display_order, active]
  );
  return findById(result.insertId);
}

async function update(id, fields) {
  const allowed = ['name', 'description', 'display_order', 'active'];
  const sets = [];
  const params = [];
  for (const key of allowed) {
    if (fields[key] !== undefined) {
      sets.push(`${key} = ?`);
      params.push(fields[key]);
    }
  }
  if (sets.length === 0) return findById(id);
  params.push(id);
  await pool.query(`UPDATE categories SET ${sets.join(', ')} WHERE id = ?`, params);
  return findById(id);
}

async function remove(id) {
  await pool.query('DELETE FROM categories WHERE id = ?', [id]);
}

module.exports = { list, findById, create, update, remove };
