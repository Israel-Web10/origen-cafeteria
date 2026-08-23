const categoryModel = require('../models/categoryModel');
const asyncHandler = require('../utils/asyncHandler');

const listCategories = asyncHandler(async (req, res) => {
  // El público solo ve categorías activas; el admin autenticado ve todas.
  const onlyActive = !(req.user && req.user.role === 'admin');
  const categories = await categoryModel.list({ onlyActive });
  res.json({ categories });
});

const getCategory = asyncHandler(async (req, res) => {
  const category = await categoryModel.findById(req.params.id);
  if (!category) return res.status(404).json({ error: 'Categoría no encontrada.' });
  res.json({ category });
});

const createCategory = asyncHandler(async (req, res) => {
  const { name, description, display_order, active } = req.body;
  if (!name) return res.status(400).json({ error: 'El nombre es obligatorio.' });
  const category = await categoryModel.create({ name, description, display_order, active });
  res.status(201).json({ category });
});

const updateCategory = asyncHandler(async (req, res) => {
  const category = await categoryModel.update(req.params.id, req.body);
  res.json({ category });
});

const deleteCategory = asyncHandler(async (req, res) => {
  await categoryModel.remove(req.params.id);
  res.json({ success: true });
});

module.exports = { listCategories, getCategory, createCategory, updateCategory, deleteCategory };
