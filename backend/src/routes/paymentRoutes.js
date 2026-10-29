const express = require('express');
const h = require('../utils/asyncHandler');
const { validate } = require('../middleware/validate');
const { optionalAuth, requireStaff, requireAdmin, isStaff } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const limits = require('../middleware/rateLimits');
const s = require('../validation/schemas');
const payments = require('../services/paymentService');
const orders = require('../services/orderService');
const { z } = require('zod');

const router = express.Router();
const orderIdParam = z.object({ orderId: s.id });

// Métodos de pago
router.get('/methods', optionalAuth, h(async (req, res) => {
  res.json({ paymentMethods: await payments.listMethods({ includeInactive: isStaff(req.user) && req.query.all === 'true' }) });
}));
router.post('/methods', requireAdmin, validate({ body: s.paymentMethod }), h(async (req, res) => {
  res.status(201).json({ paymentMethod: await payments.saveMethod(null, req.body, req) });
}));
router.put('/methods/:id', requireStaff, validate({ params: s.idParam, body: s.paymentMethod }), h(async (req, res) => {
  res.json({ paymentMethod: await payments.saveMethod(req.params.id, req.body, req) });
}));

// Pagos de pedidos (personal)
router.get('/', requireStaff, validate({ query: s.paymentsQuery }), h(async (req, res) => {
  res.json(await payments.list(req.query));
}));

// El cliente informa su pago QR (dueño autenticado o token del pedido)
router.post('/orders/:orderId/proof', limits.uploads, optionalAuth, upload.single('proof'),
  validate({ params: orderIdParam, body: s.proofBody }), h(async (req, res) => {
    await orders.verifyAccess(req.params.orderId, { user: req.user, token: req.body.token });
    const payment = await payments.submitQrProof(req.params.orderId, { file: req.file, reference: req.body.reference },
      { userId: req.user?.id ?? null, ip: req.ip });
    res.json({ payment });
  }));

// Comprobante privado: solo personal autorizado
router.get('/:id/proof', requireStaff, validate({ params: s.idParam }), h(async (req, res) => {
  const file = await payments.readProof(req.params.id);
  res.set({
    'Content-Type': file.mime, 'Cache-Control': 'private, no-store', 'Content-Security-Policy': "default-src 'none'",
    'X-Content-Type-Options': 'nosniff', 'Content-Disposition': 'inline; filename="comprobante"',
  });
  res.send(file.buffer);
}));

router.put('/:id/review', requireStaff, validate({ params: s.idParam, body: s.paymentReview }), h(async (req, res) => {
  res.json({ payment: await payments.review(req.params.id, req.body, req) });
}));

router.post('/:id/refund', requireStaff, validate({ params: s.idParam, body: s.refund }), h(async (req, res) => {
  res.json({ payment: await payments.refund(req.params.id, req.body, req) });
}));

// Tarjeta — SOLO modo de pruebas (CARD_PROVIDER=test; prohibido en producción)
router.post('/orders/:orderId/card-test', optionalAuth, validate({ params: orderIdParam, body: s.cardTest }), h(async (req, res) => {
  await orders.verifyAccess(req.params.orderId, { user: req.user, token: req.body.token });
  res.json(await payments.testCardOutcome(req.params.orderId, req.body.outcome, { userId: req.user?.id ?? null, ip: req.ip }));
}));

module.exports = router;
