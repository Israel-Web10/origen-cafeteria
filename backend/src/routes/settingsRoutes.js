// Configuración del negocio, zonas de entrega, monedas y tipos de cambio.
const express = require('express');
const h = require('../utils/asyncHandler');
const { validate } = require('../middleware/validate');
const { optionalAuth, requireStaff, requireAdmin, isStaff } = require('../middleware/auth');
const s = require('../validation/schemas');
const settingsService = require('../services/settingsService');
const currency = require('../services/currencyService');
const audit = require('../services/auditService');
const { query, one, withTransaction } = require('../config/db');
const { notFound } = require('../utils/errors');

const settings = express.Router();
const currencies = express.Router();

// Configuración pública: datos del negocio, zonas activas, monedas y tasas vigentes
settings.get('/', optionalAuth, h(async (req, res) => {
  const staff = isStaff(req.user);
  const [values, zones, curr, rates] = await Promise.all([
    settingsService.getAll(),
    query(`SELECT * FROM delivery_zones WHERE $1 OR active ORDER BY name`, [staff]),
    query('SELECT * FROM currencies WHERE enabled OR is_base ORDER BY is_base DESC, code'),
    currency.currentRates(),
  ]);
  if (!staff) res.set('Cache-Control', 'public, max-age=30');
  res.json({ settings: values, deliveryZones: zones, currencies: curr, exchangeRates: values.currency_display_enabled === 'true' || staff ? rates : [] });
}));

settings.put('/', requireStaff, h(async (req, res) => {
  const result = await withTransaction(async (client) => {
    const diff = await settingsService.setMany(req.body, req.user.id, client);
    if (Object.keys(diff.after).length) {
      await audit.record({ req, action: 'settings.update', entity: 'settings', before: diff.before, after: diff.after }, client);
    }
    return diff;
  });
  settingsService.invalidate();
  res.json({ settings: await settingsService.getAll({ fresh: true }), changed: Object.keys(result.after) });
}));

settings.post('/delivery-zones', requireStaff, validate({ body: s.zone }), h(async (req, res) => {
  const z = req.body;
  const zone = await one(
    'INSERT INTO delivery_zones (name, cost_cents, estimated_time_minutes, active) VALUES ($1,$2,$3,$4) RETURNING *',
    [z.name, z.cost_cents, z.estimated_time_minutes, z.active ?? true]
  );
  await audit.record({ req, action: 'zone.create', entity: 'delivery_zone', entityId: zone.id, after: zone });
  res.status(201).json({ deliveryZone: zone });
}));

settings.put('/delivery-zones/:id', requireStaff, validate({ params: s.idParam, body: s.zone }), h(async (req, res) => {
  const z = req.body;
  const before = await one('SELECT * FROM delivery_zones WHERE id = $1', [req.params.id]);
  if (!before) throw notFound('zone_not_found', 'Zona no encontrada.');
  const zone = await one(
    'UPDATE delivery_zones SET name=$2, cost_cents=$3, estimated_time_minutes=$4, active=$5 WHERE id=$1 RETURNING *',
    [req.params.id, z.name, z.cost_cents, z.estimated_time_minutes, z.active ?? true]
  );
  await audit.record({ req, action: 'zone.update', entity: 'delivery_zone', entityId: zone.id, before, after: zone });
  res.json({ deliveryZone: zone });
}));

// ---------- Monedas y tipos de cambio (administración manual) ----------
currencies.get('/', requireStaff, h(async (req, res) => {
  res.json({ currencies: await currency.listCurrencies(), rates: await currency.currentRates() });
}));
currencies.put('/:code', requireStaff, validate({ params: s.currencyCode, body: s.currencyUpdate }), h(async (req, res) => {
  const updated = await currency.updateCurrency(req.params.code, req.body);
  await audit.record({ req, action: 'currency.update', entity: 'currency', entityId: req.params.code, after: req.body });
  res.json({ currency: updated });
}));
currencies.put('/:code/base', requireAdmin, validate({ params: s.currencyCode }), h(async (req, res) => {
  await withTransaction(async (client) => {
    await currency.setBaseCurrency(req.params.code, client);
    await audit.record({ req, action: 'currency.set_base', entity: 'currency', entityId: req.params.code }, client);
  });
  res.json({ currencies: await currency.listCurrencies() });
}));
currencies.get('/rates', requireStaff, h(async (req, res) => {
  const code = /^[A-Z]{3}$/.test(req.query.quote || '') ? req.query.quote : null;
  res.json({ rates: await currency.rateHistory(code) });
}));
currencies.post('/rates', requireStaff, validate({ body: s.rate }), h(async (req, res) => {
  const rate = await currency.addRate(req.body, req.user.id);
  await audit.record({ req, action: 'exchange_rate.create', entity: 'exchange_rate', entityId: rate.id, after: rate });
  res.status(201).json({ rate });
}));

module.exports = { settings, currencies };
