const { pool } = require('../config/db');

async function listZones({ onlyActive = false } = {}) {
  let sql = 'SELECT * FROM delivery_zones';
  if (onlyActive) sql += ' WHERE active = TRUE';
  sql += ' ORDER BY name ASC';
  const [rows] = await pool.query(sql);
  return rows;
}

async function createZone({ name, cost, estimated_time_minutes = 30, active = true }) {
  const [result] = await pool.query(
    'INSERT INTO delivery_zones (name, cost, estimated_time_minutes, active) VALUES (?, ?, ?, ?)',
    [name, cost, estimated_time_minutes, active]
  );
  const [rows] = await pool.query('SELECT * FROM delivery_zones WHERE id = ?', [result.insertId]);
  return rows[0];
}

async function updateZone(id, fields) {
  const allowed = ['name', 'cost', 'estimated_time_minutes', 'active'];
  const sets = [];
  const params = [];
  for (const key of allowed) {
    if (fields[key] !== undefined) { sets.push(`${key} = ?`); params.push(fields[key]); }
  }
  if (sets.length === 0) return null;
  params.push(id);
  await pool.query(`UPDATE delivery_zones SET ${sets.join(', ')} WHERE id = ?`, params);
  const [rows] = await pool.query('SELECT * FROM delivery_zones WHERE id = ?', [id]);
  return rows[0];
}

async function createAddress({ user_id = null, recipient_name, phone, address, reference, zone_id, latitude, longitude }, connection = pool) {
  const [result] = await connection.query(
    `INSERT INTO delivery_addresses (user_id, recipient_name, phone, address, reference, zone_id, latitude, longitude)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [user_id, recipient_name, phone, address, reference || null, zone_id || null, latitude || null, longitude || null]
  );
  const [rows] = await connection.query('SELECT * FROM delivery_addresses WHERE id = ?', [result.insertId]);
  return rows[0];
}

async function findZoneById(id) {
  const [rows] = await pool.query('SELECT * FROM delivery_zones WHERE id = ?', [id]);
  return rows[0] || null;
}

module.exports = { listZones, createZone, updateZone, createAddress, findZoneById };
