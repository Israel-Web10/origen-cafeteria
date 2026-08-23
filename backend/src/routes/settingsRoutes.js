const express = require('express');
const ctrl = require('../controllers/settingsController');
const { optionalAuth, requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', optionalAuth, ctrl.getSettings);
router.put('/', requireAuth, requireRole('admin'), ctrl.updateSettings);

router.get('/delivery-zones', optionalAuth, ctrl.listDeliveryZones);
router.post('/delivery-zones', requireAuth, requireRole('admin'), ctrl.createDeliveryZone);
router.put('/delivery-zones/:id', requireAuth, requireRole('admin'), ctrl.updateDeliveryZone);

module.exports = router;
