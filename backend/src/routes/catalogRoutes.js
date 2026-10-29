// Categorías, productos y promociones.
const express = require('express');
const { z } = require('zod');
const h = require('../utils/asyncHandler');
const { validate } = require('../middleware/validate');
const { optionalAuth, requireStaff, isStaff } = require('../middleware/auth');
const s = require('../validation/schemas');
const catalog = require('../services/catalogService');
const { notFound } = require('../utils/errors');

const categories = express.Router();
const products = express.Router();
const promotions = express.Router();
const slugParam = z.object({ idOrSlug: z.string().regex(/^[a-z0-9-]{1,170}$/) });

// ---------- Categorías ----------
categories.get('/', optionalAuth, h(async (req, res) => {
  const includeInactive = isStaff(req.user) && req.query.include_inactive === 'true';
  res.json({ categories: await catalog.listCategories({ includeInactive }) });
}));
categories.get('/:idOrSlug', validate({ params: slugParam }), h(async (req, res) => {
  const category = await catalog.getCategory(req.params.idOrSlug);
  if (!category || !category.active) throw notFound('category_not_found', 'Categoría no encontrada.');
  res.json({ category });
}));
categories.post('/', requireStaff, validate({ body: s.category }), h(async (req, res) => {
  res.status(201).json({ category: await catalog.createCategory(req.body, req) });
}));
categories.put('/:id', requireStaff, validate({ params: s.idParam, body: s.category.partial() }), h(async (req, res) => {
  res.json({ category: await catalog.updateCategory(req.params.id, req.body, req) });
}));
categories.delete('/:id', requireStaff, validate({ params: s.idParam }), h(async (req, res) => {
  await catalog.deleteCategory(req.params.id, req);
  res.json({ success: true });
}));

// ---------- Productos ----------
products.get('/', optionalAuth, validate({ query: s.productsQuery }), h(async (req, res) => {
  const q = req.query;
  const staff = isStaff(req.user) && q.include_inactive === true;
  const list = await catalog.listProducts({
    staff, category: q.category, search: q.search, sort: q.sort, featured: q.featured, isNew: q.new, promo: q.promo,
    limit: q.limit, offset: q.offset,
  });
  res.set('Cache-Control', staff ? 'no-store' : 'public, max-age=30');
  res.json({ products: list });
}));
products.get('/:idOrSlug', optionalAuth, validate({ params: slugParam }), h(async (req, res) => {
  const product = await catalog.getProduct(req.params.idOrSlug, { staff: isStaff(req.user) });
  if (!product) throw notFound('product_not_found', 'Producto no encontrado.');
  res.json({ product });
}));
products.post('/', requireStaff, validate({ body: s.productCreate }), h(async (req, res) => {
  res.status(201).json({ product: await catalog.createProduct(req.body, req) });
}));
products.put('/:id', requireStaff, validate({ params: s.idParam, body: s.productUpdate }), h(async (req, res) => {
  res.json({ product: await catalog.updateProduct(req.params.id, req.body, req) });
}));
products.delete('/:id', requireStaff, validate({ params: s.idParam }), h(async (req, res) => {
  res.json(await catalog.deleteProduct(req.params.id, req));
}));
products.put('/:id/components', requireStaff, validate({ params: s.idParam, body: s.components }), h(async (req, res) => {
  await catalog.setComponents(req.params.id, req.body.components, req);
  res.json({ product: await catalog.getProduct(String(req.params.id), { staff: true }) });
}));

// ---------- Promociones ----------
promotions.get('/', optionalAuth, h(async (req, res) => {
  const all = isStaff(req.user) && req.query.all === 'true';
  const list = await catalog.listPromotions({ includeInactive: all });
  res.json({ promotions: all ? list : list.filter((p) => p.running) });
}));
promotions.post('/', requireStaff, validate({ body: s.promotion }), h(async (req, res) => {
  res.status(201).json({ promotion: await catalog.savePromotion(null, req.body, req) });
}));
promotions.put('/:id', requireStaff, validate({ params: s.idParam, body: s.promotion }), h(async (req, res) => {
  res.json({ promotion: await catalog.savePromotion(req.params.id, req.body, req) });
}));

module.exports = { categories, products, promotions };
