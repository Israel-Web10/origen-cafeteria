const express = require('express');
const { body } = require('express-validator');
const ctrl = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('El nombre es obligatorio.'),
    body('email').isEmail().withMessage('Correo inválido.'),
    body('password').isLength({ min: 8 }).withMessage('La contraseña debe tener al menos 8 caracteres.'),
  ],
  ctrl.register
);

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Correo inválido.'),
    body('password').notEmpty().withMessage('La contraseña es obligatoria.'),
  ],
  ctrl.login
);

router.get('/me', requireAuth, ctrl.me);

module.exports = router;
