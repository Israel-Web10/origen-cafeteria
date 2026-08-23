const express = require('express');
const ctrl = require('../controllers/categoryController');
const { optionalAuth, requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', optionalAuth, ctrl.listCategories);
router.get('/:id', ctrl.getCategory);
router.post('/', requireAuth, requireRole('admin'), ctrl.createCategory);
router.put('/:id', requireAuth, requireRole('admin'), ctrl.updateCategory);
router.delete('/:id', requireAuth, requireRole('admin'), ctrl.deleteCategory);

module.exports = router;
