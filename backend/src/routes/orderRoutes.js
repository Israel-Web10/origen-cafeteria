const express = require('express');
const ctrl = require('../controllers/orderController');
const { optionalAuth, requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// Crear pedido: cliente logueado o invitado (optionalAuth adjunta req.user si hay token)
router.post('/', optionalAuth, ctrl.createOrder);

// Seguimiento público por número de pedido (sin login) — pensado para
// clientes invitados que guardaron su número de pedido.
router.get('/track/:orderNumber', ctrl.trackOrder);

router.get('/stats', requireAuth, requireRole('admin'), ctrl.getStats);

router.get('/', requireAuth, ctrl.listOrders); // admin ve todos, cliente ve los suyos
router.get('/:id', requireAuth, ctrl.getOrder);
router.put('/:id/status', requireAuth, requireRole('admin'), ctrl.updateOrderStatus);

module.exports = router;
