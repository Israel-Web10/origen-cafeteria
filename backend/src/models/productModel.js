const { pool } = require('../config/db');

/**
 * Lista productos con filtros opcionales.
 * publicView=true => solo activos y disponibles (para el cliente).
 */
async function list({ categoryId, publicView = false, search } = {}) {
  let sql = `
    SELECT p.*, c.name AS category_name
    FROM products p
    JOIN categories c ON c.id = p.category_id
    WHERE 1 = 1`;
  const params = [];

  if (publicView) {
    sql += ' AND p.active = TRUE AND p.available = TRUE AND c.active = TRUE';
  }
  if (categoryId) {
    sql += ' AND p.category_id = ?';
    params.push(categoryId);
  }
  if (search) {
    sql += ' AND (p.name LIKE ? OR p.description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  sql += ' ORDER BY c.display_order ASC, p.name ASC';

  const [rows] = await pool.query(sql, params);
  return rows;
}

async function findById(id) {
  const [rows] = await pool.query(
    `SELECT p.*, c.name AS category_name
     FROM products p JOIN categories c ON c.id = p.category_id
     WHERE p.id = ? LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

async function create(data) {
  const {
    category_id, name, description, price, image_url,
    stock = null, available = true, active = true,
  } = data;
  const [result] = await pool.query(
    `INSERT INTO products (category_id, name, description, price, image_url, stock, available, active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [category_id, name, description || null, price, image_url || null, stock, available, active]
  );
  return findById(result.insertId);
}

async function update(id, fields) {
  const allowed = ['category_id', 'name', 'description', 'price', 'image_url', 'stock', 'available', 'active'];
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
  await pool.query(`UPDATE products SET ${sets.join(', ')} WHERE id = ?`, params);
  return findById(id);
}

async function remove(id) {
  await pool.query('DELETE FROM products WHERE id = ?', [id]);
}

async function decrementStock(id, quantity, connection = pool) {
  await connection.query(
    'UPDATE products SET stock = stock - ? WHERE id = ? AND stock IS NOT NULL',
    [quantity, id]
  );
}

/** Productos más vendidos (para el dashboard) */
async function topSelling(limit = 5) {
  const [rows] = await pool.query(
    `SELECT p.id, p.name, p.image_url, SUM(oi.quantity) AS total_sold
     FROM order_items oi
     JOIN products p ON p.id = oi.product_id
     JOIN orders o ON o.id = oi.order_id
     WHERE o.status != 'cancelado'
     GROUP BY p.id, p.name, p.image_url
     ORDER BY total_sold DESC
     LIMIT ?`,
    [limit]
  );
  return rows;
}

module.exports = { list, findById, create, update, remove, decrementStock, topSelling };
