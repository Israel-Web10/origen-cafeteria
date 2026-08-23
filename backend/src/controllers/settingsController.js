const settingsModel = require('../models/settingsModel');
const deliveryModel = require('../models/deliveryModel');
const asyncHandler = require('../utils/asyncHandler');

const getSettings = asyncHandler(async (req, res) => {
  const settings = await settingsModel.getAll();
  const zones = await deliveryModel.listZones({ onlyActive: !(req.user && req.user.role === 'admin') });
  res.json({ settings, deliveryZones: zones });
});

const updateSettings = asyncHandler(async (req, res) => {
  const settings = await settingsModel.setMany(req.body);
  res.json({ settings });
});

const listDeliveryZones = asyncHandler(async (req, res) => {
  const isAdmin = req.user && req.user.role === 'admin';
  const zones = await deliveryModel.listZones({ onlyActive: !isAdmin });
  res.json({ deliveryZones: zones });
});

const createDeliveryZone = asyncHandler(async (req, res) => {
  const { name, cost, estimated_time_minutes, active } = req.body;
  if (!name || cost === undefined) return res.status(400).json({ error: 'name y cost son obligatorios.' });
  const zone = await deliveryModel.createZone({ name, cost, estimated_time_minutes, active });
  res.status(201).json({ deliveryZone: zone });
});

const updateDeliveryZone = asyncHandler(async (req, res) => {
  const zone = await deliveryModel.updateZone(req.params.id, req.body);
  res.json({ deliveryZone: zone });
});

module.exports = { getSettings, updateSettings, listDeliveryZones, createDeliveryZone, updateDeliveryZone };
