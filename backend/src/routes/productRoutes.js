const express = require('express');
const ctrl = require('../controllers/productController');
const { optionalAuth, requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', optionalAuth, ctrl.listProducts);
router.get('/:id', ctrl.getProduct);
router.post('/', requireAuth, requireRole('admin'), ctrl.createProduct);
router.put('/:id', requireAuth, requireRole('admin'), ctrl.updateProduct);
router.delete('/:id', requireAuth, requireRole('admin'), ctrl.deleteProduct);

module.exports = router;
