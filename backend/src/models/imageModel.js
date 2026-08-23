const { pool } = require('../config/db');

async function list({ entityType, entityId } = {}) {
  let sql = 'SELECT * FROM images WHERE 1 = 1';
  const params = [];
  if (entityType) { sql += ' AND entity_type = ?'; params.push(entityType); }
  if (entityId !== undefined) { sql += ' AND entity_id = ?'; params.push(entityId); }
  sql += ' ORDER BY display_order ASC, id DESC';
  const [rows] = await pool.query(sql, params);
  return rows;
}

async function create({ entity_type, entity_id = null, url, alt_text = null, is_primary = false, display_order = 0 }) {
  const [result] = await pool.query(
    `INSERT INTO images (entity_type, entity_id, url, alt_text, is_primary, display_order)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [entity_type, entity_id, url, alt_text, is_primary, display_order]
  );
  const [rows] = await pool.query('SELECT * FROM images WHERE id = ?', [result.insertId]);
  return rows[0];
}

async function remove(id) {
  const [rows] = await pool.query('SELECT * FROM images WHERE id = ?', [id]);
  await pool.query('DELETE FROM images WHERE id = ?', [id]);
  return rows[0] || null;
}

module.exports = { list, create, remove };
