const { pool } = require('../config/db');

async function getAll() {
  const [rows] = await pool.query('SELECT setting_key, setting_value FROM settings');
  const result = {};
  for (const row of rows) result[row.setting_key] = row.setting_value;
  return result;
}

async function get(key) {
  const [rows] = await pool.query('SELECT setting_value FROM settings WHERE setting_key = ? LIMIT 1', [key]);
  return rows[0] ? rows[0].setting_value : null;
}

/** Upsert de múltiples claves a la vez: { cafe_name: 'ORIGEN', phone: '...' } */
async function setMany(entries) {
  const keys = Object.keys(entries);
  if (keys.length === 0) return getAll();

  const values = keys.map((k) => [k, String(entries[k] ?? '')]);
  await pool.query(
    `INSERT INTO settings (setting_key, setting_value) VALUES ?
     ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
    [values]
  );
  return getAll();
}

module.exports = { getAll, get, setMany };
