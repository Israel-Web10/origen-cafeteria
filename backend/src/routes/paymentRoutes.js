const express = require('express');
const ctrl = require('../controllers/paymentController');
const { optionalAuth, requireAuth, requireRole } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

const router = express.Router();

// Métodos de pago (QR / efectivo / tarjeta)
router.get('/methods', optionalAuth, ctrl.listPaymentMethods);
router.post('/methods', requireAuth, requireRole('admin'), ctrl.createPaymentMethod);
router.put('/methods/:id', requireAuth, requireRole('admin'), ctrl.updatePaymentMethod);

// Pagos de pedidos
router.get('/', requireAuth, requireRole('admin'), ctrl.listPayments);
router.post('/:orderId/proof', optionalAuth, upload.single('proof'), ctrl.uploadProof);
router.put('/:id/status', requireAuth, requireRole('admin'), ctrl.updatePaymentStatus);

module.exports = router;
