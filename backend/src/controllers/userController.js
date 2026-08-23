const userModel = require('../models/userModel');
const asyncHandler = require('../utils/asyncHandler');

const listUsers = asyncHandler(async (req, res) => {
  const { role } = req.query;
  const users = await userModel.list({ role: role || undefined });
  res.json({ users });
});

const getUser = asyncHandler(async (req, res) => {
  const isAdmin = req.user.role === 'admin';
  const targetId = Number(req.params.id);
  if (!isAdmin && req.user.id !== targetId) {
    return res.status(403).json({ error: 'No tienes permiso para ver este usuario.' });
  }
  const user = await userModel.findById(targetId);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });
  const orders = await userModel.orderHistory(targetId);
  res.json({ user, orders });
});

const updateUser = asyncHandler(async (req, res) => {
  const isAdmin = req.user.role === 'admin';
  const targetId = Number(req.params.id);
  if (!isAdmin && req.user.id !== targetId) {
    return res.status(403).json({ error: 'No tienes permiso para editar este usuario.' });
  }
  // Solo un admin puede activar/desactivar cuentas.
  const fields = isAdmin ? req.body : { name: req.body.name, phone: req.body.phone };
  const user = await userModel.update(targetId, fields);
  res.json({ user });
});

module.exports = { listUsers, getUser, updateUser };
