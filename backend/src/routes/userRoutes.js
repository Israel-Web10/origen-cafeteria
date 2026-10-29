const express = require('express');
const h = require('../utils/asyncHandler');
const { validate } = require('../middleware/validate');
const { requireStaff, requireAdmin } = require('../middleware/auth');
const s = require('../validation/schemas');
const users = require('../services/userService');
const audit = require('../services/auditService');

const router = express.Router();
const auditRouter = express.Router();

// El gerente ve clientes (para atención de pedidos); solo el admin gestiona roles y personal.
router.get('/', requireStaff, validate({ query: s.usersQuery }), h(async (req, res) => {
  const q = req.query;
  const role = req.user.role === 'admin' ? q.role : 'client';
  res.json(await users.list({ ...q, role }));
}));
router.get('/:id', requireStaff, validate({ params: s.idParam }), h(async (req, res) => {
  res.json(await users.adminGet(req.params.id, { includeContact: true }));
}));
router.put('/:id', requireAdmin, validate({ params: s.idParam, body: s.adminUserUpdate }), h(async (req, res) => {
  res.json({ user: await users.adminUpdate(req.params.id, req.body, req) });
}));
router.post('/:id/reset-password', requireAdmin, validate({ params: s.idParam }), h(async (req, res) => {
  res.json(await users.resetPassword(req.params.id, req));
}));
router.post('/staff', requireAdmin, validate({ body: s.createStaff }), h(async (req, res) => {
  res.status(201).json(await users.createStaff(req.body, req));
}));

auditRouter.get('/', requireAdmin, validate({ query: s.auditQuery }), h(async (req, res) => {
  const q = req.query;
  res.json({ entries: await audit.list({ entity: q.entity, userId: q.user_id, from: q.from, to: q.to, limit: q.limit, offset: q.offset }) });
}));

module.exports = { users: router, audit: auditRouter };
