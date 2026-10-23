// Pruebas de integración HTTP reales (Express + PostgreSQL de pruebas).
const test = require('node:test');
const assert = require('node:assert/strict');
const { pool, resetDatabase, createUser, PNG_1PX } = require('./helpers');
const request = require('supertest');

let app;
const ctx = {};

async function login(email, password) {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  return res.body.token;
}
const auth = (t) => ({ Authorization: `Bearer ${t}` });

function orderBody(over = {}) {
  return {
    customerName: 'Ana Pérez', customerPhone: '+591 71234567', deliveryType: 'pickup',
    paymentMethodId: ctx.cashId, items: [{ product_id: ctx.espressoId, quantity: 2 }], acceptTerms: true, ...over,
  };
}

test.before(async () => {
  await resetDatabase();
  app = require('../src/app');
  ctx.admin = await createUser('admin', 'admin@test.local');
  ctx.manager = await createUser('manager', 'manager@test.local');
  ctx.client = await createUser('client', 'client@test.local');
  ctx.adminToken = await login(ctx.admin.email, ctx.admin.password);
  ctx.managerToken = await login(ctx.manager.email, ctx.manager.password);
  ctx.clientToken = await login(ctx.client.email, ctx.client.password);
  ctx.cashId = (await pool.query("SELECT id FROM payment_methods WHERE type = 'cash'")).rows[0].id;
  ctx.qrId = (await pool.query("SELECT id FROM payment_methods WHERE type = 'qr'")).rows[0].id;
  ctx.cardId = (await pool.query("SELECT id FROM payment_methods WHERE type = 'card'")).rows[0].id;
});

test.after(async () => {
  await pool.end();
});

test('health check responde con estado de la BD', async () => {
  const res = await request(app).get('/api/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.db, 'ok');
  assert.ok(res.headers['content-security-policy']);
  assert.equal(res.headers['x-powered-by'], undefined);
});

test('registro valida contraseña y no devuelve el hash', async () => {
  let res = await request(app).post('/api/auth/register').send({ name: 'X', email: 'bad', password: '123' });
  assert.equal(res.status, 400);
  res = await request(app).post('/api/auth/register').send({ name: 'Nuevo Cliente', email: 'Nuevo@Test.local', password: 'Segura123' });
  assert.equal(res.status, 201);
  assert.equal(res.body.user.email, 'nuevo@test.local');
  assert.equal(res.body.user.password_hash, undefined);
  res = await request(app).post('/api/auth/register').send({ name: 'Otro', email: 'nuevo@test.local', password: 'Segura123' });
  assert.equal(res.status, 409);
  // Campos extra rechazados (sin asignación masiva de rol)
  res = await request(app).post('/api/auth/register').send({ name: 'Hacker', email: 'h@test.local', password: 'Segura123', role: 'admin' });
  assert.equal(res.status, 400);
});

test('bloqueo tras 5 intentos fallidos', async () => {
  const u = await createUser('client', 'lock@test.local');
  for (let i = 0; i < 5; i++) {
    const r = await request(app).post('/api/auth/login').send({ email: u.email, password: 'incorrecta1' });
    assert.equal(r.status, 401);
  }
  const r = await request(app).post('/api/auth/login').send({ email: u.email, password: u.password });
  assert.equal(r.status, 429);
});

test('cambiar contraseña revoca los tokens anteriores', async () => {
  const u = await createUser('client', 'rev@test.local');
  const oldToken = await login(u.email, u.password);
  const res = await request(app).put('/api/auth/me/password').set(auth(oldToken)).send({ current_password: u.password, new_password: 'NuevaClave456' });
  assert.equal(res.status, 200);
  assert.equal((await request(app).get('/api/auth/me').set(auth(oldToken))).status, 401);
  assert.equal((await request(app).get('/api/auth/me').set(auth(res.body.token))).status, 200);
});

test('el administrador restablece una contraseña olvidada y se revocan sesiones', async () => {
  const u = await createUser('client', 'olvido@test.local');
  const oldToken = await login(u.email, u.password);
  assert.equal((await request(app).post(`/api/users/${u.id}/reset-password`).set(auth(ctx.managerToken))).status, 403);
  const res = await request(app).post(`/api/users/${u.id}/reset-password`).set(auth(ctx.adminToken));
  assert.equal(res.status, 200);
  assert.equal((await request(app).get('/api/auth/me').set(auth(oldToken))).status, 401);
  assert.equal((await request(app).post('/api/auth/login').send({ email: u.email, password: res.body.temporary_password })).status, 200);
});

test('autorización por rol en el backend', async () => {
  assert.equal((await request(app).get('/api/analytics/summary').set(auth(ctx.clientToken))).status, 403);
  assert.equal((await request(app).get('/api/analytics/summary')).status, 401);
  assert.equal((await request(app).post('/api/categories').set(auth(ctx.clientToken)).send({ name: 'X' })).status, 403);
  // El gerente no administra roles
  assert.equal((await request(app).put(`/api/users/${ctx.client.id}`).set(auth(ctx.managerToken)).send({ role: 'admin' })).status, 403);
  assert.equal((await request(app).get('/api/audit').set(auth(ctx.managerToken))).status, 403);
});

test('el personal crea catálogo con variantes, receta y stock', async () => {
  let res = await request(app).post('/api/categories').set(auth(ctx.managerToken))
    .send({ name: 'Cafés', translations: { en: { name: 'Coffee' } } });
  assert.equal(res.status, 201);
  ctx.catId = res.body.category.id;
  res = await request(app).post('/api/products').set(auth(ctx.managerToken))
    .send({ category_id: ctx.catId, name: 'Espresso', price_cents: 1200, cost_cents: 300 });
  assert.equal(res.status, 201);
  ctx.espressoId = res.body.product.id;
  res = await request(app).post('/api/products').set(auth(ctx.managerToken)).send({
    category_id: ctx.catId, name: 'Cappuccino', price_cents: 1800,
    variants: [{ name: 'Mediano', price_delta_cents: 0 }, { name: 'Grande', price_delta_cents: 400 }],
  });
  ctx.cappId = res.body.product.id;
  res = await request(app).post('/api/products').set(auth(ctx.managerToken))
    .send({ category_id: ctx.catId, name: 'Brownie', price_cents: 1400, stock: 5 });
  ctx.brownieId = res.body.product.id;

  res = await request(app).post('/api/inventory/items').set(auth(ctx.managerToken)).send({ name: 'Café en grano', unit: 'g', min_quantity: 50 });
  assert.equal(res.status, 201);
  ctx.coffeeItem = res.body.item.id;
  res = await request(app).post('/api/inventory/movements').set(auth(ctx.managerToken))
    .send({ target: 'item', id: ctx.coffeeItem, type: 'entrada', quantity: 1000, unit_cost_cents: 12 });
  assert.equal(res.status, 201);
  res = await request(app).put(`/api/products/${ctx.espressoId}/components`).set(auth(ctx.managerToken))
    .send({ components: [{ inventory_item_id: ctx.coffeeItem, quantity: 18 }] });
  assert.equal(res.status, 200);

  // Vista pública: sin costo interno
  res = await request(app).get(`/api/products/${ctx.espressoId}`);
  assert.equal(res.status, 200);
  assert.equal(res.body.product.cost_cents, undefined);
  assert.equal(res.body.product.purchasable, true);
});

test('el total se calcula en el servidor y se rechazan cantidades inválidas', async () => {
  let res = await request(app).post('/api/orders').send(orderBody({ items: [{ product_id: ctx.espressoId, quantity: -3 }] }));
  assert.equal(res.status, 400);
  res = await request(app).post('/api/orders').send(orderBody({ items: [{ product_id: ctx.espressoId, quantity: 2, price: 1 }] }));
  assert.equal(res.status, 400, 'campos desconocidos como price se rechazan');
  res = await request(app).post('/api/orders').send(orderBody({ total_cents: 1 }));
  assert.equal(res.status, 400);
  res = await request(app).post('/api/orders').send(orderBody());
  assert.equal(res.status, 201, JSON.stringify(res.body));
  assert.equal(res.body.order.total_cents, 2400);
  assert.match(res.body.order.order_number, /^ORD-\d{4}-\d{6}$/);
  assert.ok(res.body.order.public_token);
  ctx.guestOrder = res.body.order;
  // Receta: 2 espressos × 18 g
  const { rows } = await pool.query('SELECT quantity::text AS q FROM inventory_items WHERE id = $1', [ctx.coffeeItem]);
  assert.equal(Number(rows[0].q), 964);
});

test('cotización coincide con el pedido real y no escribe nada', async () => {
  const before = (await pool.query('SELECT COUNT(*)::int AS n FROM orders')).rows[0].n;
  const q = await request(app).post('/api/orders/quote').send({ items: [{ product_id: ctx.espressoId, quantity: 3 }] });
  assert.equal(q.status, 200, JSON.stringify(q.body));
  assert.equal(q.body.quote.total_cents, 3600);
  assert.equal((await pool.query('SELECT COUNT(*)::int AS n FROM orders')).rows[0].n, before);
  const o = await request(app).post('/api/orders').send(orderBody({ items: [{ product_id: ctx.espressoId, quantity: 3 }] }));
  assert.equal(o.body.order.total_cents, q.body.quote.total_cents);
});

test('variantes: obligatoria si existen, precio con diferencia', async () => {
  let res = await request(app).post('/api/orders').send(orderBody({ items: [{ product_id: ctx.cappId, quantity: 1 }] }));
  assert.equal(res.status, 400);
  assert.equal(res.body.code, 'variant_required');
  const variants = (await request(app).get(`/api/products/${ctx.cappId}`)).body.product.variants;
  const grande = variants.find((v) => v.name === 'Grande');
  res = await request(app).post('/api/orders').send(orderBody({ items: [{ product_id: ctx.cappId, variant_id: grande.id, quantity: 1 }] }));
  assert.equal(res.status, 201);
  assert.equal(res.body.order.total_cents, 2200);
});

test('métodos de pago inactivos y tarjeta sin proveedor se rechazan', async () => {
  const res = await request(app).post('/api/orders').send(orderBody({ paymentMethodId: ctx.qrId }));
  assert.equal(res.status, 400);
  assert.equal(res.body.code, 'payment_method_invalid');
});

test('concurrencia: 12 compras simultáneas de un producto con stock 5', async () => {
  const results = await Promise.all(Array.from({ length: 12 }, () =>
    request(app).post('/api/orders').send(orderBody({ items: [{ product_id: ctx.brownieId, quantity: 1 }] }))));
  const ok = results.filter((r) => r.status === 201).length;
  const rejected = results.filter((r) => r.status === 409).length;
  assert.equal(ok, 5);
  assert.equal(rejected, 7);
  const { rows } = await pool.query('SELECT stock FROM products WHERE id = $1', [ctx.brownieId]);
  assert.equal(rows[0].stock, 0);
  const nums = await pool.query('SELECT COUNT(DISTINCT order_number)::int AS d, COUNT(*)::int AS n FROM orders');
  assert.equal(nums.rows[0].d, nums.rows[0].n, 'números de pedido únicos');
});

test('idempotencia: el mismo Idempotency-Key no duplica el pedido', async () => {
  const key = 'test-idem-key-0000000001';
  const [a, b] = await Promise.all([
    request(app).post('/api/orders').set('Idempotency-Key', key).send(orderBody()),
    request(app).post('/api/orders').set('Idempotency-Key', key).send(orderBody()),
  ]);
  assert.ok([200, 201].includes(a.status) && [200, 201].includes(b.status));
  assert.equal(a.body.order.id, b.body.order.id);
});

test('seguimiento: token da vista completa, teléfono vista reducida, sin datos → 404', async () => {
  const n = ctx.guestOrder.order_number;
  let res = await request(app).get(`/api/orders/track/${n}`);
  assert.equal(res.status, 404);
  res = await request(app).get(`/api/orders/track/${n}?phone4=0000`);
  assert.equal(res.status, 404);
  res = await request(app).get(`/api/orders/track/${n}?phone4=4567`);
  assert.equal(res.status, 200);
  assert.equal(res.body.order.limited, true);
  assert.equal(res.body.order.customer_phone, undefined);
  res = await request(app).get(`/api/orders/track/${n}?token=${ctx.guestOrder.public_token}`);
  assert.equal(res.status, 200);
  assert.equal(res.body.order.customer_phone, '+591 71234567');
  // IDOR: sin token ni sesión no se puede leer por id
  assert.equal((await request(app).get(`/api/orders/${ctx.guestOrder.id}`)).status, 403);
  assert.equal((await request(app).get(`/api/orders/${ctx.guestOrder.id}`).set(auth(ctx.clientToken))).status, 403);
});

test('el cliente solo ve sus propios pedidos', async () => {
  const res = await request(app).post('/api/orders').set(auth(ctx.clientToken)).send(orderBody());
  assert.equal(res.status, 201);
  const mine = await request(app).get('/api/orders').set(auth(ctx.clientToken));
  assert.equal(mine.body.orders.length, 1);
  const all = await request(app).get('/api/orders').set(auth(ctx.managerToken));
  assert.ok(all.body.total > 1);
});

test('pago QR: firma de archivo, verificación manual y auditoría', async () => {
  // Activar QR requiere imagen oficial
  let res = await request(app).put(`/api/payments/methods/${ctx.qrId}`).set(auth(ctx.managerToken)).send({ active: true });
  assert.equal(res.status, 400);
  res = await request(app).post('/api/uploads').set(auth(ctx.managerToken)).field('entity_type', 'qr').attach('image', PNG_1PX, 'qr.png');
  assert.equal(res.status, 201);
  res = await request(app).put(`/api/payments/methods/${ctx.qrId}`).set(auth(ctx.managerToken)).send({ active: true, config: { qr_image: res.body.image.url } });
  assert.equal(res.status, 200, JSON.stringify(res.body));

  res = await request(app).post('/api/orders').send(orderBody({ paymentMethodId: ctx.qrId }));
  const order = res.body.order;
  // HTML disfrazado de PNG → rechazado
  res = await request(app).post(`/api/payments/orders/${order.id}/proof`).field('token', order.public_token)
    .attach('proof', Buffer.from('<html><script>alert(1)</script></html>'), { filename: 'x.png', contentType: 'image/png' });
  assert.equal(res.status, 400);
  // Sin token → prohibido
  res = await request(app).post(`/api/payments/orders/${order.id}/proof`).field('reference', 'ABC123');
  assert.equal(res.status, 403);
  res = await request(app).post(`/api/payments/orders/${order.id}/proof`).field('token', order.public_token).field('reference', 'OP-778899')
    .attach('proof', PNG_1PX, 'comprobante.png');
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.equal(res.body.payment.status, 'en_verificacion');

  const payId = res.body.payment.id;
  // El comprobante no es público
  const stored = await pool.query('SELECT proof_storage_key FROM payments WHERE id = $1', [payId]);
  assert.equal((await request(app).get(`/uploads/public/${stored.rows[0].proof_storage_key}`)).status, 404);
  assert.equal((await request(app).get(`/api/payments/${payId}/proof`).set(auth(ctx.clientToken))).status, 403);
  assert.equal((await request(app).get(`/api/payments/${payId}/proof`).set(auth(ctx.managerToken))).status, 200);

  assert.equal((await request(app).put(`/api/payments/${payId}/review`).set(auth(ctx.clientToken)).send({ decision: 'verificado' })).status, 403);
  res = await request(app).put(`/api/payments/${payId}/review`).set(auth(ctx.managerToken)).send({ decision: 'verificado' });
  assert.equal(res.status, 200);
  const o = (await request(app).get(`/api/orders/${order.id}`).set(auth(ctx.managerToken))).body.order;
  assert.equal(o.status, 'confirmado');
  assert.equal(o.payment_status, 'pagado');
  assert.equal(o.payments[0].verified_by_name, 'manager test');
  const auditRows = await pool.query("SELECT 1 FROM audit_log WHERE action = 'payment.verificado' AND entity_id = $1", [String(payId)]);
  assert.equal(auditRows.rowCount, 1);
  // No se puede verificar dos veces
  assert.equal((await request(app).put(`/api/payments/${payId}/review`).set(auth(ctx.managerToken)).send({ decision: 'verificado' })).status, 409);
  // Reembolso
  res = await request(app).post(`/api/payments/${payId}/refund`).set(auth(ctx.managerToken)).send({ reason: 'Producto agotado' });
  assert.equal(res.status, 200);
});

test('efectivo: importe recibido obligatorio y cálculo del cambio', async () => {
  const order = (await request(app).post('/api/orders').send(orderBody())).body.order;
  const payId = order.payments[0].id;
  let res = await request(app).put(`/api/payments/${payId}/review`).set(auth(ctx.managerToken)).send({ decision: 'verificado' });
  assert.equal(res.status, 400);
  res = await request(app).put(`/api/payments/${payId}/review`).set(auth(ctx.managerToken)).send({ decision: 'verificado', cash_received_cents: 2000 });
  assert.equal(res.status, 400);
  res = await request(app).put(`/api/payments/${payId}/review`).set(auth(ctx.managerToken)).send({ decision: 'verificado', cash_received_cents: 5000 });
  assert.equal(res.status, 200);
  assert.equal(res.body.payment.change_cents, 2600);
});

test('tarjeta en modo prueba (simulador, nunca datos de tarjeta)', async () => {
  let res = await request(app).put(`/api/payments/methods/${ctx.cardId}`).set(auth(ctx.adminToken)).send({ active: true });
  assert.equal(res.status, 200);
  const order = (await request(app).post('/api/orders').send(orderBody({ paymentMethodId: ctx.cardId }))).body.order;
  res = await request(app).post(`/api/payments/orders/${order.id}/card-test`).send({ outcome: 'approved', token: order.public_token });
  assert.equal(res.status, 200);
  assert.equal(res.body.mode, 'test');
  const o = (await request(app).get(`/api/orders/${order.id}?token=${order.public_token}`)).body.order;
  assert.equal(o.payment_status, 'pagado');
  assert.equal(o.payments[0].gateway_mode, 'test');
});

test('transiciones de estado válidas y cancelación que repone inventario', async () => {
  const before = Number((await pool.query('SELECT quantity FROM inventory_items WHERE id = $1', [ctx.coffeeItem])).rows[0].quantity);
  const order = (await request(app).post('/api/orders').send(orderBody())).body.order;
  let res = await request(app).put(`/api/orders/${order.id}/status`).set(auth(ctx.managerToken)).send({ status: 'entregado' });
  assert.equal(res.status, 409);
  res = await request(app).post(`/api/orders/${order.id}/cancel`).send({ token: order.public_token, reason: 'Me equivoqué' });
  assert.equal(res.status, 200);
  assert.equal(res.body.order.status, 'cancelado');
  const after = Number((await pool.query('SELECT quantity FROM inventory_items WHERE id = $1', [ctx.coffeeItem])).rows[0].quantity);
  assert.equal(after, before);
  // No se puede reactivar
  res = await request(app).put(`/api/orders/${order.id}/status`).set(auth(ctx.managerToken)).send({ status: 'confirmado' });
  assert.equal(res.status, 409);
});

test('inventario: ajuste por conteo, merma con motivo y sin negativos', async () => {
  let res = await request(app).post('/api/inventory/movements').set(auth(ctx.managerToken)).send({ target: 'item', id: ctx.coffeeItem, type: 'merma', quantity: 5 });
  assert.equal(res.status, 400);
  res = await request(app).post('/api/inventory/movements').set(auth(ctx.managerToken)).send({ target: 'item', id: ctx.coffeeItem, type: 'merma', quantity: 99999, reason: 'x' });
  assert.equal(res.status, 409);
  res = await request(app).post('/api/inventory/movements').set(auth(ctx.managerToken)).send({ target: 'item', id: ctx.coffeeItem, type: 'ajuste', counted_quantity: 500, reason: 'Conteo físico' });
  assert.equal(res.status, 201);
  assert.equal(Number(res.body.movement.balance_after), 500);
  res = await request(app).get('/api/inventory/movements').set(auth(ctx.managerToken)).query({ item_id: ctx.coffeeItem });
  assert.ok(res.body.total >= 3);
});

test('configuración: claves desconocidas o inválidas se rechazan', async () => {
  let res = await request(app).put('/api/settings').set(auth(ctx.managerToken)).send({ hacked: 'x' });
  assert.equal(res.status, 400);
  res = await request(app).put('/api/settings').set(auth(ctx.managerToken)).send({ logo_url: 'javascript:alert(1)' });
  assert.equal(res.status, 400);
  res = await request(app).put('/api/settings').set(auth(ctx.managerToken)).send({ business_name: 'ORIGEN Café', currency_display_enabled: 'true' });
  assert.equal(res.status, 200);
  assert.deepEqual(res.body.changed.sort(), ['business_name', 'currency_display_enabled']);
});

test('monedas: tasa manual con fuente y pedido que la registra', async () => {
  let res = await request(app).put('/api/currencies/USD').set(auth(ctx.managerToken)).send({ enabled: true });
  assert.equal(res.status, 200);
  res = await request(app).post('/api/currencies/rates').set(auth(ctx.managerToken))
    .send({ quote_code: 'USD', rate: '0.14367816', rate_type: 'manual', source: 'Prueba automatizada' });
  assert.equal(res.status, 201);
  res = await request(app).post('/api/orders').send(orderBody({ displayCurrency: 'USD' }));
  assert.equal(res.status, 201);
  assert.equal(res.body.order.currency_code, 'BOB');
  assert.equal(res.body.order.display_currency, 'USD');
  assert.equal(res.body.order.display_rate, '0.14367816');
  // No se puede cambiar la moneda base con datos existentes
  assert.equal((await request(app).put('/api/currencies/USD/base').set(auth(ctx.adminToken))).status, 400);
});

test('páginas: borrador, publicación y fallback de idioma', async () => {
  let res = await request(app).put('/api/pages/history/es/draft').set(auth(ctx.managerToken)).send({ title: 'Historia nueva', body: 'Texto' });
  assert.equal(res.status, 200);
  res = await request(app).get('/api/pages/history/es');
  assert.notEqual(res.body.page.title, 'Historia nueva', 'el borrador no se publica solo');
  res = await request(app).post('/api/pages/history/es/publish').set(auth(ctx.managerToken));
  assert.equal(res.status, 200);
  res = await request(app).get('/api/pages/history/es');
  assert.equal(res.body.page.title, 'Historia nueva');
});

test('analítica y reportes PDF/Excel con datos reales', async () => {
  let res = await request(app).get('/api/analytics/summary').set(auth(ctx.managerToken)).query({ period: 'daily' });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.ok(res.body.kpis.orders > 0);
  assert.equal(res.body.forecast.available, false);
  res = await request(app).get('/api/reports/sales/pdf').set(auth(ctx.managerToken)).query({ period: 'monthly' }).buffer(true)
    .parse((r, cb) => { const chunks = []; r.on('data', (c) => chunks.push(c)); r.on('end', () => cb(null, Buffer.concat(chunks))); });
  assert.equal(res.status, 200);
  assert.equal(res.body.subarray(0, 4).toString(), '%PDF');
  for (const type of ['orders', 'products', 'inventory', 'movements', 'comparison', 'margins', 'payment_methods']) {
    res = await request(app).get(`/api/reports/${type}/xlsx`).set(auth(ctx.managerToken)).query({ period: 'annual', locale: 'en' }).buffer(true)
      .parse((r, cb) => { const chunks = []; r.on('data', (c) => chunks.push(c)); r.on('end', () => cb(null, Buffer.concat(chunks))); });
    assert.equal(res.status, 200, type);
    assert.equal(res.body.subarray(0, 2).toString(), 'PK', type);
  }
  assert.equal((await request(app).get('/api/reports/sales/pdf').set(auth(ctx.clientToken))).status, 403);
});

test('privacidad: exportar y eliminar la cuenta propia', async () => {
  const u = await createUser('client', 'privacy@test.local');
  const token = await login(u.email, u.password);
  await request(app).post('/api/orders').set(auth(token)).send(orderBody());
  let res = await request(app).get('/api/auth/me/export').set(auth(token));
  assert.equal(res.status, 200);
  assert.equal(res.body.orders.length, 1);
  res = await request(app).delete('/api/auth/me').set(auth(token)).send({ password: u.password });
  assert.equal(res.status, 200);
  assert.equal((await request(app).get('/api/auth/me').set(auth(token))).status, 401);
  const { rows } = await pool.query('SELECT customer_phone, customer_email FROM orders WHERE user_id = $1', [u.id]);
  assert.equal(rows[0].customer_phone, '—');
  assert.equal(rows[0].customer_email, null);
});

test('inyección SQL: entradas maliciosas se tratan como texto', async () => {
  const payloads = ["' OR '1'='1", "'; DROP TABLE orders; --", "1; DELETE FROM users", "\\' UNION SELECT password_hash FROM users --", "%' OR 1=1 --"];
  const before = (await pool.query('SELECT COUNT(*)::int AS n FROM users')).rows[0].n;
  for (const p of payloads) {
    let res = await request(app).get('/api/products').query({ search: p });
    assert.equal(res.status, 200);
    assert.equal(res.body.products.length, 0, `búsqueda "${p}" no debe devolver todo`);
    res = await request(app).get('/api/products').query({ category: p });
    assert.equal(res.status, 200);
    assert.equal(res.body.products.length, 0);
    res = await request(app).post('/api/auth/login').send({ email: `x${p}@a.com`, password: p });
    assert.ok([400, 401].includes(res.status));
    res = await request(app).get(`/api/orders/track/${encodeURIComponent(p)}`);
    assert.equal(res.status, 400);
    res = await request(app).get('/api/orders').set(auth(ctx.managerToken)).query({ search: p });
    assert.equal(res.status, 200);
    assert.equal(res.body.orders.length, 0);
    res = await request(app).get(`/api/products/${encodeURIComponent(p)}`);
    assert.ok([400, 404].includes(res.status));
  }
  // Sort no admite expresiones: solo valores de una lista blanca
  assert.equal((await request(app).get('/api/products').query({ sort: 'price_asc; DROP TABLE products' })).status, 400);
  assert.equal((await pool.query('SELECT COUNT(*)::int AS n FROM users')).rows[0].n, before);
  assert.equal((await pool.query("SELECT to_regclass('public.orders') IS NOT NULL AS ok")).rows[0].ok, true);
});

test('versionado: /api/v1 y el alias /api responden igual, con cabecera de versión', async () => {
  const v1 = await request(app).get('/api/v1/products');
  const alias = await request(app).get('/api/products');
  assert.equal(v1.status, 200);
  assert.equal(v1.headers['api-version'], 'v1');
  assert.deepEqual(v1.body, alias.body);
  const ver = await request(app).get('/api/v1/version');
  assert.equal(ver.body.api, 'v1');
  assert.match(ver.body.version, /^\d+\.\d+\.\d+$/);
  const missing = await request(app).get('/api/v1/no-existe');
  assert.equal(missing.status, 404);
  assert.equal((await request(app).get('/api/v1/health')).body.db, 'ok');
});
