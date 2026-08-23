const { pool } = require('../config/db');
const productModel = require('./productModel');
const deliveryModel = require('./deliveryModel');
// (productModel también expone topSelling(), usado en stats() más abajo)
const { generateCode } = require('../utils/orderNumber');

const VALID_STATUSES = [
  'pendiente', 'confirmado', 'en_preparacion', 'listo', 'en_camino', 'entregado', 'cancelado',
];

async function nextSequence() {
  const [rows] = await pool.query(
    "SELECT COUNT(*) AS count FROM orders WHERE YEAR(created_at) = YEAR(CURDATE())"
  );
  return rows[0].count + 1;
}

/**
 * Crea un pedido completo dentro de una transacción:
 * order + order_items + (opcional) delivery_address + payment inicial.
 * `items` = [{ product_id, quantity }]
 */
async function createOrder({
  userId, customerName, customerPhone, customerEmail,
  deliveryType, deliveryAddress, paymentMethodId, items, observations, discount = 0,
}) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Validar y calcular precios desde la BD (nunca confiar en el precio del cliente)
    let subtotal = 0;
    const resolvedItems = [];
    for (const item of items) {
      const [rows] = await connection.query(
        'SELECT * FROM products WHERE id = ? AND active = TRUE FOR UPDATE',
        [item.product_id]
      );
      const product = rows[0];
      if (!product) {
        const err = new Error(`El producto ${item.product_id} no existe o no está disponible.`);
        err.status = 400;
        throw err;
      }
      if (!product.available) {
        const err = new Error(`"${product.name}" no está disponible actualmente.`);
        err.status = 400;
        throw err;
      }
      if (product.stock !== null && product.stock < item.quantity) {
        const err = new Error(`Stock insuficiente para "${product.name}".`);
        err.status = 400;
        throw err;
      }
      const lineSubtotal = Number(product.price) * item.quantity;
      subtotal += lineSubtotal;
      resolvedItems.push({
        product_id: product.id,
        product_name: product.name,
        unit_price: product.price,
        quantity: item.quantity,
        subtotal: lineSubtotal,
      });
    }

    // 2. Resolver dirección de entrega y costo de envío
    let deliveryAddressId = null;
    let deliveryFee = 0;
    if (deliveryType === 'delivery') {
      if (!deliveryAddress) {
        const err = new Error('Se requiere una dirección de entrega para delivery.');
        err.status = 400;
        throw err;
      }
      let zoneCost = 0;
      if (deliveryAddress.zone_id) {
        const zone = await deliveryModel.findZoneById(deliveryAddress.zone_id);
        if (zone) zoneCost = Number(zone.cost);
      }
      const created = await deliveryModel.createAddress(
        { ...deliveryAddress, user_id: userId || null },
        connection
      );
      deliveryAddressId = created.id;
      deliveryFee = zoneCost;
    }

    const total = subtotal - discount + deliveryFee;
    const orderNumber = generateCode('ORD', await nextSequence());

    // 3. Insertar pedido
    const [orderResult] = await connection.query(
      `INSERT INTO orders
        (order_number, user_id, customer_name, customer_phone, customer_email,
         delivery_type, delivery_address_id, payment_method_id,
         subtotal, discount, delivery_fee, total, status, observations)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendiente', ?)`,
      [
        orderNumber, userId || null, customerName, customerPhone, customerEmail || null,
        deliveryType, deliveryAddressId, paymentMethodId,
        subtotal, discount, deliveryFee, total, observations || null,
      ]
    );
    const orderId = orderResult.insertId;

    // 4. Insertar items y descontar stock
    for (const item of resolvedItems) {
      await connection.query(
        `INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity, subtotal)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [orderId, item.product_id, item.product_name, item.unit_price, item.quantity, item.subtotal]
      );
      await productModel.decrementStock(item.product_id, item.quantity, connection);
    }

    // 5. Crear registro de pago inicial (pendiente de verificación)
    await connection.query(
      `INSERT INTO payments (order_id, payment_method_id, amount, status)
       VALUES (?, ?, ?, 'pendiente')`,
      [orderId, paymentMethodId, total]
    );

    // 6. Crear ticket/comprobante
    const ticketNumber = generateCode('TCK', await nextSequence());
    await connection.query(
      'INSERT INTO tickets (order_id, ticket_number) VALUES (?, ?)',
      [orderId, ticketNumber]
    );

    await connection.commit();
    return findById(orderId);
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

async function findById(id) {
  const [orderRows] = await pool.query(
    `SELECT o.*, pm.name AS payment_method_name, pm.type AS payment_method_type,
            da.address AS delivery_address, da.reference AS delivery_reference,
            da.recipient_name AS delivery_recipient, da.phone AS delivery_phone,
            da.latitude AS delivery_latitude, da.longitude AS delivery_longitude,
            t.ticket_number
     FROM orders o
     LEFT JOIN payment_methods pm ON pm.id = o.payment_method_id
     LEFT JOIN delivery_addresses da ON da.id = o.delivery_address_id
     LEFT JOIN tickets t ON t.order_id = o.id
     WHERE o.id = ? LIMIT 1`,
    [id]
  );
  const order = orderRows[0];
  if (!order) return null;

  const [items] = await pool.query('SELECT * FROM order_items WHERE order_id = ?', [id]);
  const [payments] = await pool.query('SELECT * FROM payments WHERE order_id = ? ORDER BY created_at DESC', [id]);

  return { ...order, items, payments };
}

async function findByOrderNumber(orderNumber) {
  const [rows] = await pool.query('SELECT id FROM orders WHERE order_number = ? LIMIT 1', [orderNumber]);
  if (!rows[0]) return null;
  return findById(rows[0].id);
}

async function list({ userId, status, from, to } = {}) {
  let sql = 'SELECT o.*, pm.name AS payment_method_name FROM orders o LEFT JOIN payment_methods pm ON pm.id = o.payment_method_id WHERE 1 = 1';
  const params = [];
  if (userId) { sql += ' AND o.user_id = ?'; params.push(userId); }
  if (status) { sql += ' AND o.status = ?'; params.push(status); }
  if (from) { sql += ' AND o.created_at >= ?'; params.push(from); }
  if (to) { sql += ' AND o.created_at <= ?'; params.push(to); }
  sql += ' ORDER BY o.created_at DESC';
  const [rows] = await pool.query(sql, params);
  return rows;
}

async function updateStatus(id, status) {
  if (!VALID_STATUSES.includes(status)) {
    const err = new Error(`Estado inválido. Usa uno de: ${VALID_STATUSES.join(', ')}`);
    err.status = 400;
    throw err;
  }
  await pool.query('UPDATE orders SET status = ? WHERE id = ?', [status, id]);
  return findById(id);
}

/** Estadísticas para el dashboard administrativo */
async function stats() {
  const [[today]] = await pool.query(
    `SELECT COALESCE(SUM(total),0) AS revenue, COUNT(*) AS count
     FROM orders WHERE DATE(created_at) = CURDATE() AND status != 'cancelado'`
  );
  const [[week]] = await pool.query(
    `SELECT COALESCE(SUM(total),0) AS revenue, COUNT(*) AS count
     FROM orders WHERE YEARWEEK(created_at, 1) = YEARWEEK(CURDATE(), 1) AND status != 'cancelado'`
  );
  const [[month]] = await pool.query(
    `SELECT COALESCE(SUM(total),0) AS revenue, COUNT(*) AS count
     FROM orders WHERE YEAR(created_at) = YEAR(CURDATE()) AND MONTH(created_at) = MONTH(CURDATE()) AND status != 'cancelado'`
  );
  const [[pending]] = await pool.query(
    `SELECT COUNT(*) AS count FROM orders WHERE status IN ('pendiente','confirmado','en_preparacion')`
  );
  const [[completed]] = await pool.query(
    `SELECT COUNT(*) AS count FROM orders WHERE status = 'entregado'`
  );
  const [byPaymentMethod] = await pool.query(
    `SELECT pm.name, COUNT(*) AS count
     FROM orders o JOIN payment_methods pm ON pm.id = o.payment_method_id
     WHERE o.status != 'cancelado'
     GROUP BY pm.name`
  );
  const [salesLast7Days] = await pool.query(
    `SELECT DATE(created_at) AS date, COALESCE(SUM(total),0) AS revenue
     FROM orders
     WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY) AND status != 'cancelado'
     GROUP BY DATE(created_at)
     ORDER BY date ASC`
  );
  const topProducts = await productModel.topSelling(5);

  return { today, week, month, pending, completed, byPaymentMethod, salesLast7Days, topProducts };
}

module.exports = { createOrder, findById, findByOrderNumber, list, updateStatus, stats, VALID_STATUSES };
