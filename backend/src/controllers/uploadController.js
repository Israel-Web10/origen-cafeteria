const fs = require('fs');
const path = require('path');
const imageModel = require('../models/imageModel');
const { uploadDir } = require('../middleware/upload');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Sube una imagen y la registra en la tabla `images`.
 * body: entity_type ('product'|'banner'|'gallery'|'logo'|'qr'), entity_id (opcional), alt_text
 *
 * NOTA sobre almacenamiento: en desarrollo las imágenes se guardan en disco
 * local (carpeta /uploads) y se sirven como archivos estáticos. Para
 * producción se recomienda migrar a un servicio externo (ver docs/API.md,
 * sección "Almacenamiento de imágenes") sin cambiar este contrato de API:
 * solo cambiaría de dónde viene la `url` que se guarda en la BD.
 */
const uploadImage = asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se recibió ningún archivo.' });

  const { entity_type = 'gallery', entity_id, alt_text, is_primary, display_order } = req.body;
  const url = `/uploads/${req.file.filename}`;

  const image = await imageModel.create({
    entity_type,
    entity_id: entity_id || null,
    url,
    alt_text,
    is_primary: is_primary === 'true' || is_primary === true,
    display_order: Number(display_order) || 0,
  });

  res.status(201).json({ image });
});

const listImages = asyncHandler(async (req, res) => {
  const { entity_type, entity_id } = req.query;
  const images = await imageModel.list({ entityType: entity_type, entityId: entity_id });
  res.json({ images });
});

const deleteImage = asyncHandler(async (req, res) => {
  const image = await imageModel.remove(req.params.id);
  if (image) {
    const filePath = path.join(uploadDir, path.basename(image.url));
    fs.unlink(filePath, () => {}); // best-effort, no bloquea la respuesta
  }
  res.json({ success: true });
});

module.exports = { uploadImage, listImages, deleteImage };
