const crypto = require('crypto');
const { query, one, pool, withTransaction } = require('../config/db');
const env = require('../config/env');
const { badRequest, notFound, forbidden, conflict } = require('../utils/errors');
const { percentOf } = require('../utils/money');
const settingsService = require('./settingsService');
const currencyService = require('./currencyService');
const inventoryService = require('./inventoryService');
const audit = require('./auditService');
const { ACTIVE_PROMO } = require('./catalogService');

const STATUSES = ['pendiente', 'confirmado', 'en_preparacion', 'listo', 'en_camino', 'entregado', 'cancelado'];

// Transiciones permitidas del estado del pedido (independiente del estado del pago).
const TRANSITIONS = {
  pendiente: ['confirmado', 'cancelado'],
  confirmado: ['en_preparacion', 'cancelado'],
  en_preparacion: ['listo', 'cancelado'],
  listo: ['en_camino', 'entregado', 'cancelado'],
  en_camino: ['entregado', 'cancelado'],
  entregado: [],
  cancelado: [],
};

function err(code, message) {
  return badRequest(code, message);
}

/** Agrupa líneas repetidas (mismo producto + variante) para validar stock sobre el total. */
function mergeItems(items) {
  const map = new Map();
  for (const it of items) {
    const key = `${it.product_id}:${it.variant_id ?? 0}`;
    const prev = map.get(key);
    map.set(key, { product_id: it.product_id, variant_id: it.variant_id ?? null, quantity: (prev?.quantity || 0) + it.quantity });
  }
  return [...map.values()];
}

async function createOrder(input, { user, idempotencyKey, ip }) {
  if (idempotencyKey) {
    const existing = await one('SELECT id, public_token FROM orders WHERE idempotency_key = $1', [idempotencyKey]);
    if (existing) return { ...(await findById(existing.id)), public_token: existing.public_token, replayed: true };
  }

  const settings = await settingsService.getAll();
  if (input.deliveryType === 'pickup' && settings.pickup_enabled !== 'true') throw err('pickup_disabled', 'La recogida en local no está disponible.');
  if (input.deliveryType === 'delivery' && settings.delivery_enabled !== 'true') throw err('delivery_disabled', 'La entrega a domicilio no está disponible.');

  const method = await one('SELECT * FROM payment_methods WHERE id = $1 AND active', [input.paymentMethodId]);
  if (!method) throw err('payment_method_invalid', 'El método de pago no está disponible.');
  if (method.type === 'card' && env.CARD_PROVIDER === 'none') throw err('card_unavailable', 'El pago con tarjeta no está habilitado.');

  const items = mergeItems(input.items);
  if (items.length > 50) throw err('too_many_items', 'Demasiados productos distintos en un pedido.');

  try {
    return await withTransaction(async (client) => {
      const base = await currencyService.baseCurrency(client);

      const priced = await priceOrder(client, items, input, { lock: true, settings });
      const { resolved, subtotal, discount, deliveryFee, total } = priced;
      let deliveryAddressId = null;
      if (input.deliveryType === 'delivery') {
        const a = input.deliveryAddress;
        const addr = await one(
          `INSERT INTO delivery_addresses (user_id, recipient_name, phone, address, reference, zone_id, latitude, longitude)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
          [user?.id ?? null, a.recipient_name || input.customerName, a.phone || input.customerPhone, a.address,
            a.reference ?? null, a.zone_id ?? null, a.latitude ?? null, a.longitude ?? null],
          client
        );
        deliveryAddressId = addr.id;
      }

      // 5) Moneda de visualización (informativa; se cobra en la moneda base)
      let display = { code: null, rate: null, id: null };
      if (input.displayCurrency && input.displayCurrency !== base.code && settings.currency_display_enabled === 'true') {
        const rate = (await currencyService.currentRates()).find((r) => r.quote_code === input.displayCurrency);
        if (rate) display = { code: rate.quote_code, rate: rate.rate, id: rate.id };
      }

      // 6) Número de pedido desde secuencia (sin carreras) y token público
      const { seq } = await one("SELECT nextval('order_number_seq')::int AS seq", [], client);
      const year = new Date().getFullYear();
      const orderNumber = `ORD-${year}-${String(seq).padStart(6, '0')}`;
      const publicToken = crypto.randomBytes(24).toString('base64url');

      const order = await one(
        `INSERT INTO orders (order_number, public_token, idempotency_key, user_id, customer_name, customer_phone, customer_email,
            locale, delivery_type, delivery_address_id, payment_method_id, currency_code,
            subtotal_cents, discount_cents, delivery_fee_cents, total_cents, display_currency, display_rate, display_rate_id, observations)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20) RETURNING id`,
        [orderNumber, publicToken, idempotencyKey ?? null, user?.id ?? null, input.customerName, input.customerPhone,
          input.customerEmail ?? null, input.locale || 'es', input.deliveryType, deliveryAddressId, method.id, base.code,
          subtotal, discount, deliveryFee, total, display.code, display.rate, display.id, input.observations ?? null],
        client
      );

      for (const r of resolved) {
        await client.query(
          `INSERT INTO order_items (order_id, product_id, variant_id, category_id, product_name, variant_name,
              unit_price_cents, unit_cost_cents, quantity, discount_cents, subtotal_cents)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
          [order.id, r.product.id, r.variant?.id ?? null, r.product.category_id, r.product.name, r.variant?.name ?? null,
            r.unit, r.product.cost_cents, r.quantity, r.lineDiscount, r.lineSubtotal]
        );
      }

      // 7) Descontar inventario (productos e insumos por receta), con movimientos trazables
      await inventoryService.consumeForOrder(client, order.id, resolved, user?.id ?? null);

      await client.query(
        `INSERT INTO order_status_history (order_id, from_status, to_status, changed_by, note) VALUES ($1, NULL, 'pendiente', $2, 'Pedido creado')`,
        [order.id, user?.id ?? null]
      );
      await client.query(
        `INSERT INTO payments (order_id, payment_method_id, method_type, amount_cents, currency_code, status, gateway, gateway_mode)
         VALUES ($1,$2,$3,$4,$5,'pendiente',$6,$7)`,
        [order.id, method.id, method.type, total, base.code,
          method.type === 'card' ? env.CARD_PROVIDER : null, method.type === 'card' ? 'test' : null]
      );
      await client.query('INSERT INTO tickets (order_id, ticket_number) VALUES ($1, $2)', [order.id, orderNumber.replace('ORD', 'TCK')]);
      await audit.record({ userId: user?.id ?? null, req: { ip }, action: 'order.create', entity: 'order', entityId: order.id,
        after: { order_number: orderNumber, total_cents: total } }, client);

      const full = await findById(order.id, client);
      return { ...full, public_token: publicToken };
    });
  } catch (e) {
    // Dos peticiones simultáneas con la misma Idempotency-Key: devolver el pedido ya creado.
    if (e.code === '23505' && idempotencyKey && String(e.constraint).includes('idempotency')) {
      const existing = await one('SELECT id, public_token FROM orders WHERE idempotency_key = $1', [idempotencyKey]);
      if (existing) return { ...(await findById(existing.id)), public_token: existing.public_token, replayed: true };
    }
    throw e;
  }
}

/**
 * Calcula precios, descuentos, stock y envío SOLO en el servidor.
 * lock=true bloquea las filas de producto (FOR UPDATE, en orden de id) para crear el pedido;
 * lock=false se usa para cotizar sin bloquear ni escribir.
 */
async function priceOrder(client, items, input, { lock, settings }) {
  const productIds = [...new Set(items.map((i) => i.product_id))].sort((a, b) => a - b);
  const products = await query(
    `SELECT p.*, c.active AS category_active, ${ACTIVE_PROMO} AS promotion
       FROM products p JOIN categories c ON c.id = p.category_id
      WHERE p.id = ANY($1::int[]) ORDER BY p.id ${lock ? 'FOR UPDATE OF p' : ''}`,
    [productIds],
    client
  );
  const byId = new Map(products.map((p) => [p.id, p]));
  const variantIds = items.map((i) => i.variant_id).filter(Boolean);
  const variants = variantIds.length ? await query('SELECT * FROM product_variants WHERE id = ANY($1::int[])', [variantIds], client) : [];
  const variantById = new Map(variants.map((v) => [v.id, v]));
  const withVariants = new Set((await query(
    'SELECT DISTINCT product_id FROM product_variants WHERE active AND product_id = ANY($1::int[])', [productIds], client
  )).map((r) => r.product_id));

  let subtotal = 0;
  let discount = 0;
  const resolved = [];
  const unitsPerProduct = new Map();
  for (const it of items) {
    const p = byId.get(it.product_id);
    if (!p || !p.active || !p.category_active) throw err('product_unavailable', `El producto ${it.product_id} no existe o no está disponible.`);
    if (!p.available) throw err('product_unavailable', `"${p.name}" no está disponible actualmente.`);
    let variant = null;
    if (it.variant_id) {
      variant = variantById.get(it.variant_id);
      if (!variant || variant.product_id !== p.id || !variant.active) throw err('variant_invalid', `Variante no válida para "${p.name}".`);
    } else if (withVariants.has(p.id)) {
      throw err('variant_required', `Elige una opción para "${p.name}".`);
    }
    const unit = p.price_cents + (variant ? variant.price_delta_cents : 0);
    if (unit < 0) throw err('price_invalid', `Precio inválido para "${p.name}".`);
    const promo = p.promotion;
    const unitDiscount = promo ? (promo.kind === 'percent' ? percentOf(unit, promo.value) : Math.min(promo.value, unit)) : 0;
    const lineGross = unit * it.quantity;
    const lineDiscount = unitDiscount * it.quantity;
    subtotal += lineGross;
    discount += lineDiscount;
    unitsPerProduct.set(p.id, (unitsPerProduct.get(p.id) || 0) + it.quantity);
    resolved.push({ product: p, variant, quantity: it.quantity, unit, lineDiscount, lineSubtotal: lineGross - lineDiscount });
  }

  for (const [productId, qty] of unitsPerProduct) {
    const p = byId.get(productId);
    if (p.stock !== null && p.stock < qty) {
      throw conflict('insufficient_stock', `Stock insuficiente para "${p.name}" (disponible: ${p.stock}).`);
    }
  }

  let deliveryFee = 0;
  let zone = null;
  if (input.deliveryType === 'delivery') {
    const a = input.deliveryAddress;
    if (!a && lock) throw err('address_required', 'Se requiere una dirección de entrega.');
    const zones = await query('SELECT * FROM delivery_zones WHERE active', [], client);
    if (zones.length) {
      zone = zones.find((z) => z.id === a?.zone_id) || null;
      if (!zone && lock) throw err('zone_required', 'Selecciona una zona de entrega válida.');
      deliveryFee = zone ? zone.cost_cents : 0;
    }
    const min = Number(settings.delivery_min_order_cents || 0);
    if (min > 0 && subtotal - discount < min) throw err('below_minimum', 'El pedido no alcanza el mínimo para entrega a domicilio.');
  }
  return { resolved, subtotal, discount, deliveryFee, total: subtotal - discount + deliveryFee, zone };
}

/** Cotización de solo lectura para el checkout (no crea nada ni bloquea filas). */
async function quoteOrder(input) {
  const settings = await settingsService.getAll();
  const items = mergeItems(input.items);
  const client = await pool.connect();
  try {
    await client.query('BEGIN READ ONLY');
    const base = await currencyService.baseCurrency(client);
    const q = await priceOrder(client, items, input, { lock: false, settings });
    await client.query('COMMIT');
    return {
      currency_code: base.code,
      lines: q.resolved.map((r) => ({
        product_id: r.product.id, variant_id: r.variant?.id ?? null, name: r.product.name, variant_name: r.variant?.name ?? null,
        unit_price_cents: r.unit, quantity: r.quantity, discount_cents: r.lineDiscount, subtotal_cents: r.lineSubtotal,
        promotion: r.product.promotion?.name ?? null,
      })),
      subtotal_cents: q.subtotal,
      discount_cents: q.discount,
      delivery_fee_cents: q.deliveryFee,
      total_cents: q.total,
      delivery_zone: q.zone ? { id: q.zone.id, name: q.zone.name, estimated_time_minutes: q.zone.estimated_time_minutes } : null,
    };
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

async function findById(id, client) {
  const order = await one(
    `SELECT o.*, pm.name AS payment_method_name, pm.type AS payment_method_type, pm.config AS payment_method_config,
            da.address AS delivery_address, da.reference AS delivery_reference, da.recipient_name AS delivery_recipient,
            da.phone AS delivery_phone, dz.name AS delivery_zone_name, t.ticket_number
       FROM orders o
       JOIN payment_methods pm ON pm.id = o.payment_method_id
       LEFT JOIN delivery_addresses da ON da.id = o.delivery_address_id
       LEFT JOIN delivery_zones dz ON dz.id = da.zone_id
       LEFT JOIN tickets t ON t.order_id = o.id
      WHERE o.id = $1`,
    [id],
    client
  );
  if (!order) return null;
  order.items = await query('SELECT * FROM order_items WHERE order_id = $1 ORDER BY id', [id], client);
  order.payments = await query(
    `SELECT p.id, p.order_id, p.payment_method_id, p.method_type, p.amount_cents, p.currency_code, p.status, p.reference,
            (p.proof_storage_key IS NOT NULL) AS has_proof, p.cash_received_cents, p.change_cents, p.gateway, p.gateway_mode,
            p.rejection_reason, p.verified_at, u.name AS verified_by_name, p.created_at
       FROM payments p LEFT JOIN users u ON u.id = p.verified_by
      WHERE p.order_id = $1 ORDER BY p.created_at DESC, p.id DESC`,
    [id],
    client
  );
  order.history = await query(
    `SELECT h.from_status, h.to_status, h.note, h.created_at, u.name AS changed_by_name
       FROM order_status_history h LEFT JOIN users u ON u.id = h.changed_by
      WHERE h.order_id = $1 ORDER BY h.created_at, h.id`,
    [id],
    client
  );
  delete order.public_token;
  delete order.idempotency_key;
  return order;
}

/** Vista pública reducida (sin teléfono, correo ni dirección). */
function publicView(order, { full }) {
  if (full) return order;
  const [first] = String(order.customer_name).split(' ');
  return {
    id: order.id,
    order_number: order.order_number,
    ticket_number: order.ticket_number,
    customer_name: `${first} ${'•'.repeat(3)}`,
    delivery_type: order.delivery_type,
    status: order.status,
    payment_status: order.payment_status,
    payment_method_type: order.payment_method_type,
    total_cents: order.total_cents,
    currency_code: order.currency_code,
    items: order.items.map((i) => ({ product_name: i.product_name, variant_name: i.variant_name, quantity: i.quantity })),
    history: order.history.map((h) => ({ to_status: h.to_status, created_at: h.created_at })),
    created_at: order.created_at,
    limited: true,
  };
}

/**
 * Seguimiento sin cuenta. Requiere el token secreto del pedido (vista completa)
 * o los últimos 4 dígitos del teléfono (vista reducida). Las respuestas de
 * error son idénticas para no revelar qué números de pedido existen.
 */
async function track(orderNumber, { token, phoneLast4 }) {
  const row = await one('SELECT id, public_token, customer_phone FROM orders WHERE order_number = $1', [orderNumber]);
  const fail = notFound('order_not_found', 'Pedido no encontrado. Verifica los datos.');
  if (!row) throw fail;
  if (token) {
    const a = Buffer.from(String(token));
    const b = Buffer.from(row.public_token);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) throw fail;
    return publicView(await findById(row.id), { full: true });
  }
  const digits = String(row.customer_phone).replace(/\D/g, '');
  if (phoneLast4 && digits.length >= 4 && digits.slice(-4) === phoneLast4) {
    return publicView(await findById(row.id), { full: false });
  }
  throw fail;
}

async function verifyAccess(orderId, { user, token }) {
  const row = await one('SELECT id, user_id, public_token FROM orders WHERE id = $1', [orderId]);
  if (!row) throw notFound('order_not_found', 'Pedido no encontrado.');
  const staff = user && ['manager', 'admin'].includes(user.role);
  const owner = user && row.user_id === user.id;
  let tokenOk = false;
  if (token) {
    const a = Buffer.from(String(token));
    const b = Buffer.from(row.public_token);
    tokenOk = a.length === b.length && crypto.timingSafeEqual(a, b);
  }
  if (!staff && !owner && !tokenOk) throw forbidden('No tienes permiso sobre este pedido.');
  return { staff, owner, tokenOk };
}

async function list({ userId, status, paymentStatus, from, to, search, limit = 50, offset = 0 }) {
  const rows = await query(
    `SELECT o.id, o.order_number, o.customer_name, o.customer_phone, o.delivery_type, o.status, o.payment_status,
            o.total_cents, o.currency_code, o.created_at, pm.name AS payment_method_name, pm.type AS payment_method_type,
            COUNT(*) OVER()::int AS total_count
       FROM orders o JOIN payment_methods pm ON pm.id = o.payment_method_id
      WHERE ($1::int IS NULL OR o.user_id = $1)
        AND ($2::text IS NULL OR o.status = $2)
        AND ($3::text IS NULL OR o.payment_status = $3)
        AND ($4::timestamptz IS NULL OR o.created_at >= $4)
        AND ($5::timestamptz IS NULL OR o.created_at < $5)
        AND ($6::text IS NULL OR o.order_number ILIKE $6 OR o.customer_name ILIKE $6 OR o.customer_phone ILIKE $6)
      ORDER BY o.created_at DESC
      LIMIT $7 OFFSET $8`,
    [userId ?? null, status ?? null, paymentStatus ?? null, from ?? null, to ?? null, search ? `%${search}%` : null, limit, offset]
  );
  const total = rows[0]?.total_count ?? 0;
  return { orders: rows.map(({ total_count: _total, ...r }) => r), total };
}

async function changeStatus(orderId, toStatus, { user, note, req }) {
  if (!STATUSES.includes(toStatus)) throw err('status_invalid', 'Estado inválido.');
  return withTransaction(async (client) => {
    const order = await one('SELECT * FROM orders WHERE id = $1 FOR UPDATE', [orderId], client);
    if (!order) throw notFound('order_not_found', 'Pedido no encontrado.');
    if (!TRANSITIONS[order.status].includes(toStatus)) {
      throw conflict('transition_invalid', `No se puede pasar de "${order.status}" a "${toStatus}".`);
    }
    if (toStatus === 'en_camino' && order.delivery_type !== 'delivery') {
      throw conflict('transition_invalid', 'Solo los pedidos a domicilio pasan por "en camino".');
    }
    if (toStatus === 'cancelado') {
      await client.query('UPDATE orders SET status = $2, cancel_reason = $3, cancelled_at = now() WHERE id = $1', [orderId, toStatus, note ?? null]);
      await inventoryService.restoreForOrder(client, orderId, user?.id ?? null);
      // Un pago aún pendiente/en verificación queda rechazado; uno ya cobrado requiere reembolso explícito.
      await client.query(
        `UPDATE payments SET status = 'rechazado', rejection_reason = 'Pedido cancelado'
          WHERE order_id = $1 AND status IN ('pendiente','en_verificacion')`,
        [orderId]
      );
      if (order.payment_status !== 'pagado') {
        await client.query(`UPDATE orders SET payment_status = 'rechazado' WHERE id = $1`, [orderId]);
      }
    } else {
      await client.query('UPDATE orders SET status = $2 WHERE id = $1', [orderId, toStatus]);
    }
    await client.query(
      'INSERT INTO order_status_history (order_id, from_status, to_status, changed_by, note) VALUES ($1,$2,$3,$4,$5)',
      [orderId, order.status, toStatus, user?.id ?? null, note ?? null]
    );
    await audit.record({ req, userId: user?.id ?? null, action: 'order.status', entity: 'order', entityId: orderId,
      before: { status: order.status }, after: { status: toStatus, note } }, client);
    return findById(orderId, client);
  });
}

module.exports = { createOrder, quoteOrder, priceOrder, findById, track, verifyAccess, list, changeStatus, publicView, STATUSES, TRANSITIONS, mergeItems };
