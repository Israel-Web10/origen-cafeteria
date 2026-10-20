// Inventario, analítica y reportes (solo personal autorizado).
const express = require('express');
const h = require('../utils/asyncHandler');
const { validate } = require('../middleware/validate');
const { requireStaff } = require('../middleware/auth');
const limits = require('../middleware/rateLimits');
const s = require('../validation/schemas');
const inventory = require('../services/inventoryService');
const analytics = require('../services/analyticsService');
const reports = require('../services/reportService');
const audit = require('../services/auditService');
const logger = require('../utils/logger');

const inventoryRouter = express.Router();
const analyticsRouter = express.Router();
const reportsRouter = express.Router();

inventoryRouter.use(requireStaff);
inventoryRouter.get('/items', h(async (req, res) => {
  res.json({ items: await inventory.listItems({ includeInactive: req.query.all === 'true' }) });
}));
inventoryRouter.post('/items', validate({ body: s.inventoryItem }), h(async (req, res) => {
  res.status(201).json({ item: await inventory.saveItem(null, req.body, req) });
}));
inventoryRouter.put('/items/:id', validate({ params: s.idParam, body: s.inventoryItem }), h(async (req, res) => {
  res.json({ item: await inventory.saveItem(req.params.id, req.body, req) });
}));
inventoryRouter.get('/movements', validate({ query: s.movementsQuery }), h(async (req, res) => {
  const q = req.query;
  res.json(await inventory.listMovements({ productId: q.product_id, itemId: q.item_id, type: q.type, from: q.from, to: q.to, limit: q.limit, offset: q.offset }));
}));
inventoryRouter.post('/movements', validate({ body: s.movement }), h(async (req, res) => {
  res.status(201).json({ movement: await inventory.recordMovement(req.body, req) });
}));
inventoryRouter.get('/alerts', h(async (req, res) => {
  const days = Math.min(Math.max(Number(req.query.days) || 14, 1), 90);
  res.json({ lowStock: await inventory.lowStock(), expiring: await inventory.expiring(days) });
}));
inventoryRouter.get('/suppliers', h(async (req, res) => {
  res.json({ suppliers: await inventory.listSuppliers() });
}));
inventoryRouter.post('/suppliers', validate({ body: s.supplier }), h(async (req, res) => {
  res.status(201).json({ supplier: await inventory.saveSupplier(null, req.body, req) });
}));
inventoryRouter.put('/suppliers/:id', validate({ params: s.idParam, body: s.supplier }), h(async (req, res) => {
  res.json({ supplier: await inventory.saveSupplier(req.params.id, req.body, req) });
}));

analyticsRouter.get('/summary', requireStaff, validate({ query: s.analyticsQuery }), h(async (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json(await analytics.summary(req.query));
}));

// GET /api/reports/:type/:format?period=monthly&date=2026-10-01&locale=es
reportsRouter.get('/:type/:format', requireStaff, limits.reports,
  validate({ params: s.reportParams, query: s.analyticsQuery }), h(async (req, res) => {
    const { type, format } = req.params;
    const report = await reports.build(type, req.query, req.user);
    const filename = `origen-${type}-${report.rows.length ? req.query.period || 'monthly' : 'vacio'}-${new Date().toISOString().slice(0, 10)}.${format}`;
    res.set({
      'Content-Type': format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'private, no-store',
    });
    await audit.record({ req, action: 'report.generate', entity: 'report', entityId: `${type}.${format}`, after: { query: req.query, rows: report.rows.length } });
    try {
      if (format === 'pdf') reports.renderPdf(report, res);
      else await reports.renderXlsx(report, res);
    } catch (err) {
      logger.error('report.render_failed', { type, format, message: err.message });
      if (!res.headersSent) throw err;
      res.destroy(err);
    }
  }));

module.exports = { inventory: inventoryRouter, analytics: analyticsRouter, reports: reportsRouter };
