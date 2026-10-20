const express = require('express');
const h = require('../utils/asyncHandler');
const { validate } = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const limits = require('../middleware/rateLimits');
const s = require('../validation/schemas');
const users = require('../services/userService');

const router = express.Router();

router.post('/register', limits.auth, validate({ body: s.register }), h(async (req, res) => {
  res.status(201).json(await users.register(req.body));
}));

router.post('/login', limits.auth, validate({ body: s.login }), h(async (req, res) => {
  res.json(await users.login(req.body, req.ip));
}));

router.get('/me', requireAuth, h(async (req, res) => {
  res.json({ user: await users.getById(req.user.id) });
}));

router.put('/me', requireAuth, validate({ body: s.profile }), h(async (req, res) => {
  res.json({ user: await users.updateProfile(req.user.id, req.body) });
}));

router.put('/me/password', requireAuth, limits.auth, validate({ body: s.changePassword }), h(async (req, res) => {
  res.json(await users.changePassword(req.user.id, req.body, req));
}));

router.post('/logout-all', requireAuth, h(async (req, res) => {
  await users.logoutAll(req.user.id, req);
  res.json({ success: true });
}));

// Derecho de acceso: descarga de los datos personales propios
router.get('/me/export', requireAuth, h(async (req, res) => {
  res.setHeader('Content-Disposition', 'attachment; filename="mis-datos-origen.json"');
  res.json(await users.exportData(req.user.id));
}));

// Derecho de supresión: elimina (anonimiza) la cuenta propia
router.delete('/me', requireAuth, limits.auth, validate({ body: s.deleteAccount }), h(async (req, res) => {
  await users.deleteAccount(req.user.id, req.body, req);
  res.json({ success: true });
}));

module.exports = router;
