// Pagos. Reglas clave:
//  - Ningún pago real se confirma automáticamente: QR y efectivo los verifica
//    una persona autorizada (gerente/admin) y queda registrado quién y cuándo.
//  - Subir un comprobante solo pasa el pago a "en_verificacion".
//  - Tarjeta: solo existe el proveedor de PRUEBAS (CARD_PROVIDER=test), que
//    jamás procesa dinero real y está prohibido en producción (ver config/env.js).
//  - No se guardan números de tarjeta, CVV ni PIN en ningún caso.
const { query, one, withTransaction } = require('../config/db');
const env = require('../config/env');
const { badRequest, notFound, conflict } = require('../utils/errors');
const storage = require('./storageService');
const audit = require('./auditService');

async function latestPayment(client, orderId) {
  return one('SELECT * FROM payments WHERE order_id = $1 ORDER BY created_at DESC, id DESC LIMIT 1 FOR UPDATE', [orderId], client);
}

/** El cliente informa su pago QR: referencia y/o comprobante (imagen privada). */
async function submitQrProof(orderId, { file, reference }, { userId, ip }) {
  if (!file && !reference) throw badRequest('proof_required', 'Adjunta el comprobante o indica la referencia de la operación.');
  const saved = file ? await storage.saveImage(file, 'private') : null;
  try {
    return await withTransaction(async (client) => {
      const order = await one('SELECT * FROM orders WHERE id = $1 FOR UPDATE', [orderId], client);
      if (!order) throw notFound('order_not_found', 'Pedido no encontrado.');
      if (order.status === 'cancelado') throw conflict('order_cancelled', 'El pedido está cancelado.');
      let payment = await latestPayment(client, orderId);
      if (!payment || payment.method_type !== 'qr') throw badRequest('not_qr', 'Este pedido no se paga con QR.');
      if (payment.status === 'verificado') throw conflict('already_paid', 'Este pago ya fue verificado.');
      if (payment.status === 'rechazado') {
        // Reintento tras rechazo: nuevo registro, el anterior queda como historial.
        payment = await one(
          `INSERT INTO payments (order_id, payment_method_id, method_type, amount_cents, currency_code, status)
           VALUES ($1,$2,'qr',$3,$4,'pendiente') RETURNING *`,
          [orderId, payment.payment_method_id, order.total_cents, order.currency_code],
          client
        );
      }
      if (payment.proof_storage_key && saved) await storage.remove('private', payment.proof_storage_key);
      const updated = await one(
        `UPDATE payments SET status = 'en_verificacion', reference = COALESCE($2, reference),
                proof_storage_key = COALESCE($3, proof_storage_key)
          WHERE id = $1 RETURNING id, status, reference, (proof_storage_key IS NOT NULL) AS has_proof`,
        [payment.id, reference ?? null, saved?.key ?? null],
        client
      );
      await client.query(`UPDATE orders SET payment_status = 'en_verificacion' WHERE id = $1`, [orderId]);
      await audit.record({ userId, req: { ip }, action: 'payment.proof_submitted', entity: 'payment', entityId: payment.id, after: { reference } }, client);
      return updated;
    });
  } catch (e) {
    if (saved) await storage.remove('private', saved.key);
    throw e;
  }
}

/**
 * Verificación manual por personal autorizado.
 * decision: 'verificado' | 'rechazado'
 * Para efectivo: cash_received_cents obligatorio (>= importe); se calcula el cambio.
 */
async function review(paymentId, { decision, reason, cash_received_cents }, req) {
  return withTransaction(async (client) => {
    const payment = await one('SELECT * FROM payments WHERE id = $1 FOR UPDATE', [paymentId], client);
    if (!payment) throw notFound('payment_not_found', 'Pago no encontrado.');
    if (!['pendiente', 'en_verificacion'].includes(payment.status)) {
      throw conflict('payment_closed', `El pago ya está "${payment.status}".`);
    }
    if (payment.method_type === 'card') throw badRequest('card_manual', 'Los pagos con tarjeta los confirma la pasarela, no el personal.');
    const order = await one('SELECT * FROM orders WHERE id = $1 FOR UPDATE', [payment.order_id], client);
    if (order.status === 'cancelado' && decision === 'verificado') throw conflict('order_cancelled', 'El pedido está cancelado.');

    let change = null;
    if (decision === 'verificado' && payment.method_type === 'cash') {
      if (cash_received_cents == null) throw badRequest('cash_required', 'Registra el importe recibido en efectivo.');
      if (cash_received_cents < payment.amount_cents) throw badRequest('cash_insufficient', 'El importe recibido es menor al total.');
      change = cash_received_cents - payment.amount_cents;
    }
    if (decision === 'rechazado' && !reason) throw badRequest('reason_required', 'Indica el motivo del rechazo.');

    const after = await one(
      `UPDATE payments SET status = $2, verified_by = $3, verified_at = now(), rejection_reason = $4,
              cash_received_cents = $5, change_cents = $6
        WHERE id = $1 RETURNING *`,
      [paymentId, decision, req.user.id, decision === 'rechazado' ? reason : null,
        decision === 'verificado' && payment.method_type === 'cash' ? cash_received_cents : null, change],
      client
    );
    await client.query('UPDATE orders SET payment_status = $2 WHERE id = $1', [order.id, decision === 'verificado' ? 'pagado' : 'rechazado']);
    // Un pago QR verificado confirma automáticamente un pedido pendiente.
    if (decision === 'verificado' && order.status === 'pendiente') {
      await client.query(`UPDATE orders SET status = 'confirmado' WHERE id = $1`, [order.id]);
      await client.query(
        `INSERT INTO order_status_history (order_id, from_status, to_status, changed_by, note) VALUES ($1,'pendiente','confirmado',$2,'Pago verificado')`,
        [order.id, req.user.id]
      );
    }
    await audit.record({ req, action: `payment.${decision}`, entity: 'payment', entityId: paymentId,
      before: { status: payment.status }, after: { status: decision, reason, cash_received_cents, change_cents: change } }, client);
    delete after.proof_storage_key;
    return after;
  });
}

/** Registra un reembolso realizado fuera del sistema (transferencia/efectivo). */
async function refund(paymentId, { reason }, req) {
  return withTransaction(async (client) => {
    const payment = await one('SELECT * FROM payments WHERE id = $1 FOR UPDATE', [paymentId], client);
    if (!payment) throw notFound('payment_not_found', 'Pago no encontrado.');
    if (payment.status !== 'verificado') throw conflict('not_refundable', 'Solo se puede reembolsar un pago verificado.');
    await client.query(`UPDATE payments SET status = 'reembolsado', rejection_reason = $2 WHERE id = $1`, [paymentId, reason]);
    await client.query(`UPDATE orders SET payment_status = 'reembolsado' WHERE id = $1`, [payment.order_id]);
    await audit.record({ req, action: 'payment.refund', entity: 'payment', entityId: paymentId, before: { status: 'verificado' }, after: { status: 'reembolsado', reason } }, client);
    return { id: paymentId, status: 'reembolsado' };
  });
}

/**
 * Proveedor de tarjeta de PRUEBAS. Simula la notificación de una pasarela.
 * Nunca recibe datos de tarjeta: solo un resultado simulado.
 */
async function testCardOutcome(orderId, outcome, { userId, ip }) {
  if (env.CARD_PROVIDER !== 'test') throw badRequest('card_unavailable', 'El modo de pruebas de tarjeta no está activo.');
  return withTransaction(async (client) => {
    const payment = await latestPayment(client, orderId);
    if (!payment || payment.method_type !== 'card') throw badRequest('not_card', 'Este pedido no se paga con tarjeta.');
    if (payment.status !== 'pendiente') throw conflict('payment_closed', 'El pago ya fue procesado.');
    const approved = outcome === 'approved';
    await client.query(
      `UPDATE payments SET status = $2, gateway_reference = $3, verified_at = now(), rejection_reason = $4 WHERE id = $1`,
      [payment.id, approved ? 'verificado' : 'rechazado', `TEST-${Date.now()}`, approved ? null : 'Rechazado (simulación)']
    );
    await client.query('UPDATE orders SET payment_status = $2 WHERE id = $1', [orderId, approved ? 'pagado' : 'rechazado']);
    if (approved) {
      const moved = await one(`UPDATE orders SET status = 'confirmado' WHERE id = $1 AND status = 'pendiente' RETURNING id`, [orderId], client);
      if (moved) {
        await client.query(
          `INSERT INTO order_status_history (order_id, from_status, to_status, note) VALUES ($1,'pendiente','confirmado','Pago con tarjeta (MODO PRUEBA)')`,
          [orderId]
        );
      }
    }
    await audit.record({ userId, req: { ip }, action: 'payment.card_test', entity: 'payment', entityId: payment.id, after: { outcome, mode: 'test' } }, client);
    return { status: approved ? 'verificado' : 'rechazado', mode: 'test' };
  });
}

async function list({ status, method, from, to, limit = 50, offset = 0 }) {
  const rows = await query(
    `SELECT p.id, p.order_id, p.method_type, p.amount_cents, p.currency_code, p.status, p.reference,
            (p.proof_storage_key IS NOT NULL) AS has_proof, p.cash_received_cents, p.change_cents, p.gateway_mode,
            p.rejection_reason, p.verified_at, p.created_at, u.name AS verified_by_name,
            o.order_number, o.customer_name, o.status AS order_status, pm.name AS payment_method_name,
            COUNT(*) OVER()::int AS total_count
       FROM payments p
       JOIN orders o ON o.id = p.order_id
       JOIN payment_methods pm ON pm.id = p.payment_method_id
       LEFT JOIN users u ON u.id = p.verified_by
      WHERE ($1::text IS NULL OR p.status = $1)
        AND ($2::text IS NULL OR p.method_type = $2)
        AND ($3::timestamptz IS NULL OR p.created_at >= $3)
        AND ($4::timestamptz IS NULL OR p.created_at < $4)
      ORDER BY CASE p.status WHEN 'en_verificacion' THEN 0 WHEN 'pendiente' THEN 1 ELSE 2 END, p.created_at DESC
      LIMIT $5 OFFSET $6`,
    [status ?? null, method ?? null, from ?? null, to ?? null, limit, offset]
  );
  return { payments: rows.map(({ total_count: _total, ...r }) => r), total: rows[0]?.total_count ?? 0 };
}

async function readProof(paymentId) {
  const row = await one('SELECT proof_storage_key FROM payments WHERE id = $1', [paymentId]);
  if (!row || !row.proof_storage_key) throw notFound('proof_not_found', 'Este pago no tiene comprobante.');
  const file = await storage.read('private', row.proof_storage_key);
  if (!file) throw notFound('proof_not_found', 'Comprobante no disponible.');
  return file;
}

// ---------- Métodos de pago ----------

// Solo campos públicos permitidos en config (nunca credenciales).
const CONFIG_KEYS = ['instructions', 'instructions_en', 'instructions_fr', 'qr_image', 'account_holder', 'bank', 'cash_on_pickup', 'cash_on_delivery'];

function cleanConfig(config = {}) {
  const out = {};
  for (const k of CONFIG_KEYS) if (config[k] !== undefined) out[k] = config[k];
  return out;
}

async function listMethods({ includeInactive = false } = {}) {
  const rows = await query('SELECT * FROM payment_methods WHERE $1 OR active ORDER BY display_order, id', [includeInactive]);
  return rows.map((m) => ({ ...m, unavailable_reason: m.type === 'card' && env.CARD_PROVIDER === 'none' ? 'no_provider' : null, test_mode: m.type === 'card' && env.CARD_PROVIDER === 'test' }));
}

async function saveMethod(id, data, req) {
  return withTransaction(async (client) => {
    const before = id ? await one('SELECT * FROM payment_methods WHERE id = $1', [id], client) : null;
    if (id && !before) throw notFound('method_not_found', 'Método de pago no encontrado.');
    const type = before?.type ?? data.type;
    const active = data.active ?? before?.active ?? false;
    if (active && type === 'card' && env.CARD_PROVIDER === 'none') {
      throw badRequest('card_unavailable', 'No hay un proveedor de tarjeta configurado; no se puede activar este método.');
    }
    const config = data.config !== undefined ? cleanConfig({ ...(before?.config || {}), ...data.config }) : before?.config ?? {};
    if (active && type === 'qr' && !config.qr_image) {
      throw badRequest('qr_image_required', 'Sube la imagen del QR oficial antes de activar este método.');
    }
    const after = id
      ? await one(
          `UPDATE payment_methods SET name = COALESCE($2, name), active = $3, config = $4, display_order = COALESCE($5, display_order),
                  translations = COALESCE($6, translations) WHERE id = $1 RETURNING *`,
          [id, data.name ?? null, active, JSON.stringify(config), data.display_order ?? null, data.translations ? JSON.stringify(data.translations) : null], client)
      : await one(
          `INSERT INTO payment_methods (type, name, active, config, display_order, translations) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
          [type, data.name, active, JSON.stringify(config), data.display_order ?? 0, JSON.stringify(data.translations ?? {})], client);
    await audit.record({ req, action: id ? 'payment_method.update' : 'payment_method.create', entity: 'payment_method', entityId: after.id, before, after }, client);
    return after;
  });
}

module.exports = { submitQrProof, review, refund, testCardOutcome, list, readProof, listMethods, saveMethod };
