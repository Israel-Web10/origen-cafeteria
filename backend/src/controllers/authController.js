const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const userModel = require('../models/userModel');
const asyncHandler = require('../utils/asyncHandler');

function signToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

function sanitizeUser(user) {
  // Nunca devolver el password_hash al cliente.
  const { password_hash, ...safe } = user;
  return safe;
}

const register = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

  const { name, email, password, phone } = req.body;

  const existing = await userModel.findByEmail(email);
  if (existing) {
    return res.status(409).json({ error: 'Ya existe una cuenta registrada con ese correo.' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await userModel.create({ name, email, passwordHash, phone, role: 'client' });
  const token = signToken(user);

  res.status(201).json({ user: sanitizeUser(user), token });
});

const login = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

  const { email, password } = req.body;
  const user = await userModel.findByEmail(email);
  if (!user || !user.active) {
    return res.status(401).json({ error: 'Correo o contraseña incorrectos.' });
  }

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) {
    return res.status(401).json({ error: 'Correo o contraseña incorrectos.' });
  }

  const token = signToken(user);
  res.json({ user: sanitizeUser(user), token });
});

const me = asyncHandler(async (req, res) => {
  const user = await userModel.findById(req.user.id);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });
  res.json({ user });
});

module.exports = { register, login, me };
