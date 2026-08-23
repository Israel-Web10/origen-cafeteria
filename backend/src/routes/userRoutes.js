const express = require('express');
const ctrl = require('../controllers/userController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, requireRole('admin'), ctrl.listUsers);
router.get('/:id', requireAuth, ctrl.getUser);
router.put('/:id', requireAuth, ctrl.updateUser);

module.exports = router;
