const productModel = require('../models/productModel');
const asyncHandler = require('../utils/asyncHandler');

const listProducts = asyncHandler(async (req, res) => {
  const isAdmin = req.user && req.user.role === 'admin';
  const { category_id, search } = req.query;
  const products = await productModel.list({
    categoryId: category_id || undefined,
    search: search || undefined,
    publicView: !isAdmin,
  });
  res.json({ products });
});

const getProduct = asyncHandler(async (req, res) => {
  const product = await productModel.findById(req.params.id);
  if (!product) return res.status(404).json({ error: 'Producto no encontrado.' });
  res.json({ product });
});

const createProduct = asyncHandler(async (req, res) => {
  const { category_id, name, price } = req.body;
  if (!category_id || !name || price === undefined) {
    return res.status(400).json({ error: 'category_id, name y price son obligatorios.' });
  }
  if (Number(price) < 0) {
    return res.status(400).json({ error: 'El precio no puede ser negativo.' });
  }
  const product = await productModel.create(req.body);
  res.status(201).json({ product });
});

const updateProduct = asyncHandler(async (req, res) => {
  if (req.body.price !== undefined && Number(req.body.price) < 0) {
    return res.status(400).json({ error: 'El precio no puede ser negativo.' });
  }
  const product = await productModel.update(req.params.id, req.body);
  res.json({ product });
});

const deleteProduct = asyncHandler(async (req, res) => {
  // order_items conserva una copia histórica del nombre/precio, así que
  // borrar un producto ya vendido es seguro (su product_id queda en NULL
  // en esos pedidos antiguos, pero el historial no se pierde).
  // Aun así, para el día a día es preferible desactivar (PUT active=false)
  // en vez de eliminar, y así el producto no aparece más en el menú público.
  await productModel.remove(req.params.id);
  res.json({ success: true });
});

module.exports = { listProducts, getProduct, createProduct, updateProduct, deleteProduct };
