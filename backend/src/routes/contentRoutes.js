// Imágenes, páginas editables y consentimiento de cookies.
const express = require('express');
const h = require('../utils/asyncHandler');
const { validate } = require('../middleware/validate');
const { requireStaff } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const limits = require('../middleware/rateLimits');
const s = require('../validation/schemas');
const images = require('../services/imageService');
const content = require('../services/contentService');

const imagesRouter = express.Router();
const pagesRouter = express.Router();
const consentRouter = express.Router();

imagesRouter.get('/', validate({ query: s.imagesQuery }), h(async (req, res) => {
  res.json({ images: await images.list({ entityType: req.query.entity_type, entityId: req.query.entity_id }) });
}));
imagesRouter.post('/', requireStaff, limits.uploads, upload.single('image'), validate({ body: s.imageMeta }), h(async (req, res) => {
  res.status(201).json({ image: await images.upload(req.file, req.body, req) });
}));
imagesRouter.put('/:id', requireStaff, validate({ params: s.idParam, body: s.imageUpdate }), h(async (req, res) => {
  res.json({ image: await images.update(req.params.id, req.body, req) });
}));
imagesRouter.delete('/:id', requireStaff, validate({ params: s.idParam }), h(async (req, res) => {
  await images.remove(req.params.id, req);
  res.json({ success: true });
}));

// Páginas
pagesRouter.get('/', requireStaff, h(async (req, res) => {
  res.json({ pages: await content.listAll() });
}));
pagesRouter.get('/:slug/:locale', validate({ params: s.pageParams }), h(async (req, res) => {
  res.set('Cache-Control', 'public, max-age=60');
  res.json({ page: await content.getPublished(req.params.slug, req.params.locale) });
}));
pagesRouter.get('/:slug/:locale/edit', requireStaff, validate({ params: s.pageParams }), h(async (req, res) => {
  res.json({ page: await content.getForEdit(req.params.slug, req.params.locale) });
}));
pagesRouter.put('/:slug/:locale/draft', requireStaff, validate({ params: s.pageParams, body: s.page }), h(async (req, res) => {
  res.json({ page: await content.saveDraft(req.params.slug, req.params.locale, req.body, req) });
}));
pagesRouter.post('/:slug/:locale/publish', requireStaff, validate({ params: s.pageParams }), h(async (req, res) => {
  res.json({ page: await content.publish(req.params.slug, req.params.locale, req) });
}));
pagesRouter.delete('/:slug/:locale/draft', requireStaff, validate({ params: s.pageParams }), h(async (req, res) => {
  await content.discardDraft(req.params.slug, req.params.locale);
  res.json({ success: true });
}));

// Registro de la elección de cookies (sin datos personales: id aleatorio del navegador)
consentRouter.post('/', limits.tracking, validate({ body: s.consent }), h(async (req, res) => {
  await content.recordConsent(req.body, req.get('user-agent'));
  res.status(201).json({ success: true });
}));

module.exports = { images: imagesRouter, pages: pagesRouter, consent: consentRouter };
