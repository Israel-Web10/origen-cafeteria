const paymentModel = require('../models/paymentModel');
const paymentMethodModel = require('../models/paymentMethodModel');
const orderModel = require('../models/orderModel');
const asyncHandler = require('../utils/asyncHandler');

// ---- Métodos de pago (QR / efectivo / tarjeta) ----

const listPaymentMethods = asyncHandler(async (req, res) => {
  const isAdmin = req.user && req.user.role === 'admin';
  const methods = await paymentMethodModel.list({ onlyActive: !isAdmin });
  res.json({ paymentMethods: methods });
});

const createPaymentMethod = asyncHandler(async (req, res) => {
  const { type, name, active, config } = req.body;
  if (!type || !name) return res.status(400).json({ error: 'type y name son obligatorios.' });
  const method = await paymentMethodModel.create({ type, name, active, config });
  res.status(201).json({ paymentMethod: method });
});

const updatePaymentMethod = asyncHandler(async (req, res) => {
  const method = await paymentMethodModel.update(req.params.id, req.body);
  res.json({ paymentMethod: method });
});

// ---- Pagos de pedidos ----

const listPayments = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const payments = await paymentModel.list({ status: status || undefined });
  res.json({ payments });
});

/** El cliente sube su comprobante de pago (ej: captura del QR pagado) */
const uploadProof = asyncHandler(async (req, res) => {
  const order = await orderModel.findById(req.params.orderId);
  if (!order) return res.status(404).json({ error: 'Pedido no encontrado.' });

  const isAdmin = req.user && req.user.role === 'admin';
  const isOwner = req.user && order.user_id === req.user.id;
  const isGuestOrder = order.user_id === null;
  // Los pedidos de invitado (sin cuenta) no tienen dueño autenticable: se
  // confía en que solo quien conoce el id/número de pedido puede subir el
  // comprobante, igual que el seguimiento público por número de pedido.
  if (!isAdmin && !isOwner && !isGuestOrder) {
    return res.status(403).json({ error: 'No tienes permiso sobre este pedido.' });
  }
  if (!req.file) return res.status(400).json({ error: 'No se recibió ningún archivo.' });

  const url = `/uploads/${req.file.filename}`;
  const payment = await paymentModel.attachProof(order.id, url);
  res.json({ payment });
});

/** El admin verifica o rechaza un pago */
const updatePaymentStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!status) return res.status(400).json({ error: 'El campo status es obligatorio.' });
  const payment = await paymentModel.updateStatus(req.params.id, status, req.user.id);
  res.json({ payment });
});

module.exports = {
  listPaymentMethods, createPaymentMethod, updatePaymentMethod,
  listPayments, uploadProof, updatePaymentStatus,
};
