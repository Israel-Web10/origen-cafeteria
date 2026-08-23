const express = require('express');
const ctrl = require('../controllers/uploadController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

const router = express.Router();

router.get('/', ctrl.listImages);
router.post('/', requireAuth, requireRole('admin'), upload.single('image'), ctrl.uploadImage);
router.delete('/:id', requireAuth, requireRole('admin'), ctrl.deleteImage);

module.exports = router;
