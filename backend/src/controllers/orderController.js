const orderModel = require('../models/orderModel');
const asyncHandler = require('../utils/asyncHandler');

const createOrder = asyncHandler(async (req, res) => {
  const {
    customerName, customerPhone, customerEmail,
    deliveryType, deliveryAddress, paymentMethodId, items, observations,
  } = req.body;

  if (!customerName || !customerPhone) {
    return res.status(400).json({ error: 'Nombre y teléfono del cliente son obligatorios.' });
  }
  if (!['pickup', 'delivery'].includes(deliveryType)) {
    return res.status(400).json({ error: 'deliveryType debe ser "pickup" o "delivery".' });
  }
  if (!paymentMethodId) {
    return res.status(400).json({ error: 'Debes seleccionar un método de pago.' });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'El pedido debe tener al menos un producto.' });
  }

  const order = await orderModel.createOrder({
    userId: req.user ? req.user.id : null,
    customerName,
    customerPhone,
    customerEmail,
    deliveryType,
    deliveryAddress,
    paymentMethodId,
    items,
    observations,
  });

  res.status(201).json({ order });
});

const listOrders = asyncHandler(async (req, res) => {
  const isAdmin = req.user && req.user.role === 'admin';
  const { status } = req.query;

  const orders = await orderModel.list({
    userId: isAdmin ? undefined : req.user.id,
    status: status || undefined,
  });
  res.json({ orders });
});

const getOrder = asyncHandler(async (req, res) => {
  const order = await orderModel.findById(req.params.id);
  if (!order) return res.status(404).json({ error: 'Pedido no encontrado.' });

  const isAdmin = req.user && req.user.role === 'admin';
  const isOwner = req.user && order.user_id === req.user.id;
  if (!isAdmin && !isOwner) {
    return res.status(403).json({ error: 'No tienes permiso para ver este pedido.' });
  }
  res.json({ order });
});

/** Consulta pública de estado de pedido por número (para invitados, sin login) */
const trackOrder = asyncHandler(async (req, res) => {
  const order = await orderModel.findByOrderNumber(req.params.orderNumber);
  if (!order) return res.status(404).json({ error: 'Pedido no encontrado. Verifica el número.' });
  res.json({ order });
});

const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!status) return res.status(400).json({ error: 'El campo status es obligatorio.' });
  const order = await orderModel.updateStatus(req.params.id, status);
  res.json({ order });
});

const getStats = asyncHandler(async (req, res) => {
  const stats = await orderModel.stats();
  res.json({ stats });
});

module.exports = { createOrder, listOrders, getOrder, trackOrder, updateOrderStatus, getStats };
