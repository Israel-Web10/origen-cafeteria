const { pool } = require('../config/db');

async function findByEmail(email) {
  const [rows] = await pool.query('SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
  return rows[0] || null;
}

async function findById(id) {
  const [rows] = await pool.query(
    'SELECT id, name, email, phone, role, active, created_at, updated_at FROM users WHERE id = ? LIMIT 1',
    [id]
  );
  return rows[0] || null;
}

async function create({ name, email, passwordHash, phone, role = 'client' }) {
  const [result] = await pool.query(
    'INSERT INTO users (name, email, password_hash, phone, role) VALUES (?, ?, ?, ?, ?)',
    [name, email, passwordHash, phone || null, role]
  );
  return findById(result.insertId);
}

async function list({ role } = {}) {
  let sql = 'SELECT id, name, email, phone, role, active, created_at FROM users';
  const params = [];
  if (role) {
    sql += ' WHERE role = ?';
    params.push(role);
  }
  sql += ' ORDER BY created_at DESC';
  const [rows] = await pool.query(sql, params);
  return rows;
}

async function update(id, fields) {
  const allowed = ['name', 'phone', 'active'];
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
  await pool.query(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`, params);
  return findById(id);
}

/** Historial de pedidos de un cliente (para el panel de clientes) */
async function orderHistory(userId) {
  const [rows] = await pool.query(
    `SELECT id, order_number, total, status, created_at
     FROM orders WHERE user_id = ? ORDER BY created_at DESC`,
    [userId]
  );
  return rows;
}

module.exports = { findByEmail, findById, create, list, update, orderHistory };
