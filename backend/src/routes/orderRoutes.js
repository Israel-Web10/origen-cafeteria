const express = require('express');
const h = require('../utils/asyncHandler');
const { validate } = require('../middleware/validate');
const { optionalAuth, requireAuth, requireStaff, isStaff } = require('../middleware/auth');
const limits = require('../middleware/rateLimits');
const s = require('../validation/schemas');
const orders = require('../services/orderService');
const { badRequest, conflict } = require('../utils/errors');

const router = express.Router();

// Crear pedido (invitado o cliente). Cabecera opcional Idempotency-Key para reintentos seguros.
router.post('/', limits.orders, optionalAuth, validate({ body: s.orderCreate }), h(async (req, res) => {
  const key = req.get('Idempotency-Key');
  if (key && !/^[A-Za-z0-9_-]{16,80}$/.test(key)) throw badRequest('idempotency_key_invalid', 'Idempotency-Key inválida.');
  const order = await orders.createOrder(req.body, { user: req.user, idempotencyKey: key, ip: req.ip });
  res.status(order.replayed ? 200 : 201).json({ order });
}));

// Cotización: el servidor calcula precios, descuentos, envío y total sin crear el pedido
router.post('/quote', limits.tracking, validate({ body: s.orderQuote }), h(async (req, res) => {
  res.json({ quote: await orders.quoteOrder(req.body) });
}));

// Seguimiento público: requiere ?token=... (vista completa) o ?phone4=1234 (vista reducida)
router.get('/track/:orderNumber', limits.tracking, validate({ params: s.orderNumberParam, query: s.trackQuery }), h(async (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ order: await orders.track(req.params.orderNumber, { token: req.query.token, phoneLast4: req.query.phone4 }) });
}));

router.get('/', requireAuth, validate({ query: s.ordersQuery }), h(async (req, res) => {
  const q = req.query;
  const result = await orders.list({
    userId: isStaff(req.user) ? undefined : req.user.id,
    status: q.status, paymentStatus: q.payment_status, from: q.from, to: q.to, search: q.search, limit: q.limit, offset: q.offset,
  });
  res.json(result);
}));

router.get('/:id', optionalAuth, validate({ params: s.idParam }), h(async (req, res) => {
  await orders.verifyAccess(req.params.id, { user: req.user, token: req.query.token });
  res.set('Cache-Control', 'no-store');
  res.json({ order: await orders.findById(req.params.id) });
}));

router.put('/:id/status', requireStaff, validate({ params: s.idParam, body: s.orderStatus }), h(async (req, res) => {
  res.json({ order: await orders.changeStatus(req.params.id, req.body.status, { user: req.user, note: req.body.note, req }) });
}));

// El cliente puede cancelar su pedido solo mientras está "pendiente"
router.post('/:id/cancel', optionalAuth, validate({ params: s.idParam, body: s.customerCancel }), h(async (req, res) => {
  const access = await orders.verifyAccess(req.params.id, { user: req.user, token: req.body.token });
  const current = await orders.findById(req.params.id);
  if (!access.staff && current.status !== 'pendiente') {
    throw conflict('cannot_cancel', 'El pedido ya está en proceso; contacta a la cafetería para cancelarlo.');
  }
  const order = await orders.changeStatus(req.params.id, 'cancelado', {
    user: req.user, note: req.body.reason || 'Cancelado por el cliente', req,
  });
  res.json({ order });
}));

module.exports = router;
