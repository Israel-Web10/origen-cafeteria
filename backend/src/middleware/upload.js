const multer = require('multer');
const env = require('../config/env');

// Los archivos se reciben en memoria (máx. MAX_UPLOAD_SIZE_MB) y se validan
// por firma binaria en storageService antes de escribir nada en disco.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.MAX_UPLOAD_SIZE_MB * 1024 * 1024,
    files: 1,
    fields: 20,
    fieldNameSize: 100,
    fieldSize: 10 * 1024,
    parts: 25,
  },
});

module.exports = { upload };
