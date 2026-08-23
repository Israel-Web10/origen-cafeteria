const { pool } = require('../config/db');

async function list({ status } = {}) {
  let sql = `
    SELECT pay.*, o.order_number, o.customer_name, o.total AS order_total, pm.name AS payment_method_name
    FROM payments pay
    JOIN orders o ON o.id = pay.order_id
    JOIN payment_methods pm ON pm.id = pay.payment_method_id
    WHERE 1 = 1`;
  const params = [];
  if (status) { sql += ' AND pay.status = ?'; params.push(status); }
  sql += ' ORDER BY pay.created_at DESC';
  const [rows] = await pool.query(sql, params);
  return rows;
}

async function findById(id) {
  const [rows] = await pool.query('SELECT * FROM payments WHERE id = ? LIMIT 1', [id]);
  return rows[0] || null;
}

async function findLatestByOrder(orderId) {
  const [rows] = await pool.query(
    'SELECT * FROM payments WHERE order_id = ? ORDER BY created_at DESC LIMIT 1',
    [orderId]
  );
  return rows[0] || null;
}

async function attachProof(orderId, proofImageUrl) {
  const payment = await findLatestByOrder(orderId);
  if (!payment) return null;
  await pool.query('UPDATE payments SET proof_image_url = ? WHERE id = ?', [proofImageUrl, payment.id]);
  return findById(payment.id);
}

async function updateStatus(id, status, verifiedBy) {
  if (!['pendiente', 'verificado', 'rechazado'].includes(status)) {
    const err = new Error('Estado de pago inválido.');
    err.status = 400;
    throw err;
  }
  const verifiedAt = status === 'pendiente' ? null : new Date();
  await pool.query(
    'UPDATE payments SET status = ?, verified_by = ?, verified_at = ? WHERE id = ?',
    [status, verifiedBy || null, verifiedAt, id]
  );
  // Si se verifica el pago, avanzamos el pedido a "confirmado" automáticamente.
  if (status === 'verificado') {
    const payment = await findById(id);
    await pool.query(
      "UPDATE orders SET status = 'confirmado' WHERE id = ? AND status = 'pendiente'",
      [payment.order_id]
    );
  }
  return findById(id);
}

module.exports = { list, findById, findLatestByOrder, attachProof, updateStatus };
