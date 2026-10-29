const { z } = require('zod');
const { isOwnPublicUrl } = require('../services/storageService');

const id = z.coerce.number().int().positive().max(2147483647);
const cents = z.coerce.number().int().min(0).max(100_000_000);
const optionalText = (max) => z.string().trim().max(max).optional().nullable().transform((v) => (v === '' ? null : v));
const locale = z.enum(['es', 'en', 'fr']);
const bool = z.union([z.boolean(), z.enum(['true', 'false']).transform((v) => v === 'true')]);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha AAAA-MM-DD');
const phone = z.string().trim().min(6).max(30).regex(/^[+\d][\d\s-]{5,29}$/, 'Teléfono inválido');
const password = z.string().min(8, 'Mínimo 8 caracteres').max(128)
  .regex(/[A-Za-z]/, 'Debe incluir letras').regex(/\d/, 'Debe incluir números');
const translationEntry = z.object({
  name: z.string().trim().max(150).optional(),
  description: z.string().trim().max(2000).optional(),
  ingredients: z.string().trim().max(2000).optional(),
}).strict();
const translations = z.object({ en: translationEntry.optional(), fr: translationEntry.optional() }).strict();
const pagination = {
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).max(1_000_000).default(0),
};

const idParam = z.object({ id });

// ---------- Auth / usuarios ----------
const register = z.object({
  name: z.string().trim().min(2).max(150),
  email: z.string().trim().email().max(150),
  password,
  phone: phone.optional(),
  preferred_locale: locale.optional(),
}).strict();
const login = z.object({ email: z.string().trim().email().max(150), password: z.string().min(1).max(128) }).strict();
const profile = z.object({ name: z.string().trim().min(2).max(150).optional(), phone: phone.optional(), preferred_locale: locale.optional() }).strict();
const changePassword = z.object({ current_password: z.string().min(1).max(128), new_password: password }).strict();
const deleteAccount = z.object({ password: z.string().min(1).max(128) }).strict();
const adminUserUpdate = z.object({ role: z.enum(['client', 'manager', 'admin']).optional(), active: z.boolean().optional() }).strict();
const createStaff = z.object({ name: z.string().trim().min(2).max(150), email: z.string().trim().email().max(150), role: z.enum(['manager', 'admin']) }).strict();
const usersQuery = z.object({ role: z.enum(['client', 'manager', 'admin']).optional(), search: z.string().trim().max(100).optional(), ...pagination });

// ---------- Catálogo ----------
const category = z.object({
  name: z.string().trim().min(1).max(100),
  slug: z.string().trim().max(120).optional(),
  description: optionalText(500),
  image_url: optionalText(500),
  display_order: z.coerce.number().int().min(0).max(10000).optional(),
  active: z.boolean().optional(),
  translations: translations.optional(),
}).strict();

const variant = z.object({
  id: id.optional(),
  name: z.string().trim().min(1).max(80),
  price_delta_cents: z.coerce.number().int().min(-10_000_000).max(10_000_000).default(0),
  active: z.boolean().optional(),
  translations: z.object({ en: z.object({ name: z.string().max(80) }).partial().optional(), fr: z.object({ name: z.string().max(80) }).partial().optional() }).optional(),
}).strict();

const productBase = {
  category_id: id,
  name: z.string().trim().min(1).max(150),
  description: optionalText(2000),
  ingredients: optionalText(2000),
  allergens: optionalText(500),
  price_cents: cents,
  cost_cents: cents.optional().nullable(),
  image_url: optionalText(500),
  stock: z.coerce.number().int().min(0).max(1_000_000).optional().nullable(),
  low_stock_threshold: z.coerce.number().int().min(0).max(100000).optional(),
  prep_time_minutes: z.coerce.number().int().min(0).max(600).optional().nullable(),
  is_new: z.boolean().optional(),
  is_featured: z.boolean().optional(),
  available: z.boolean().optional(),
  active: z.boolean().optional(),
  tags: z.array(z.string().trim().min(1).max(30)).max(10).optional(),
  translations: translations.optional(),
  variants: z.array(variant).max(20).optional(),
};
const productCreate = z.object(productBase).strict();
const productUpdate = z.object({ ...productBase, track_stock: z.boolean().optional() }).partial().strict();
const productsQuery = z.object({
  category: z.string().trim().max(120).optional(),
  search: z.string().trim().max(100).optional(),
  sort: z.enum(['recommended', 'name', 'price_asc', 'price_desc', 'popular', 'newest']).optional(),
  featured: bool.optional(),
  new: bool.optional(),
  promo: bool.optional(),
  include_inactive: bool.optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});
const components = z.object({
  components: z.array(z.object({
    inventory_item_id: id,
    variant_id: id.optional().nullable(),
    quantity: z.coerce.number().positive().max(1_000_000),
  }).strict()).max(50),
}).strict();
const promotion = z.object({
  name: z.string().trim().min(1).max(120),
  description: optionalText(500),
  kind: z.enum(['percent', 'fixed']),
  value: z.coerce.number().int().positive(),
  product_id: id.optional().nullable(),
  category_id: id.optional().nullable(),
  starts_at: z.coerce.date(),
  ends_at: z.coerce.date(),
  active: z.boolean().optional(),
  translations: z.object({ en: z.object({ name: z.string().max(120) }).partial().optional(), fr: z.object({ name: z.string().max(120) }).partial().optional() }).optional(),
}).strict()
  .refine((p) => p.product_id || p.category_id, 'Elige un producto o una categoría')
  .refine((p) => p.ends_at > p.starts_at, 'La fecha de fin debe ser posterior al inicio')
  .refine((p) => p.kind !== 'percent' || p.value <= 90, 'El descuento máximo es 90%');

// ---------- Pedidos ----------
const orderCreate = z.object({
  customerName: z.string().trim().min(2).max(150),
  customerPhone: phone,
  customerEmail: z.string().trim().email().max(150).optional().or(z.literal('').transform(() => undefined)),
  deliveryType: z.enum(['pickup', 'delivery']),
  deliveryAddress: z.object({
    recipient_name: z.string().trim().max(150).optional(),
    phone: phone.optional(),
    address: z.string().trim().min(5).max(255),
    reference: optionalText(255),
    zone_id: id.optional(),
    latitude: z.coerce.number().min(-90).max(90).optional(),
    longitude: z.coerce.number().min(-180).max(180).optional(),
  }).strict().optional(),
  paymentMethodId: id,
  items: z.array(z.object({
    product_id: id,
    variant_id: id.optional().nullable(),
    quantity: z.coerce.number().int().min(1, 'Cantidad mínima 1').max(50, 'Cantidad máxima 50 por producto'),
  }).strict()).min(1, 'El pedido debe tener al menos un producto').max(100),
  observations: optionalText(500),
  displayCurrency: z.string().length(3).optional(),
  locale: locale.optional(),
  acceptTerms: z.literal(true, { message: 'Debes aceptar las condiciones de pedido' }),
}).strict();
const orderQuote = z.object({
  deliveryType: z.enum(['pickup', 'delivery']).default('pickup'),
  deliveryAddress: z.object({ zone_id: id.optional() }).passthrough().optional(),
  items: orderCreate.shape.items,
}).strip();
const ordersQuery = z.object({
  status: z.enum(['pendiente', 'confirmado', 'en_preparacion', 'listo', 'en_camino', 'entregado', 'cancelado']).optional(),
  payment_status: z.enum(['pendiente', 'en_verificacion', 'pagado', 'rechazado', 'reembolsado']).optional(),
  from: date.optional(),
  to: date.optional(),
  search: z.string().trim().max(100).optional(),
  ...pagination,
});
const orderStatus = z.object({
  status: z.enum(['pendiente', 'confirmado', 'en_preparacion', 'listo', 'en_camino', 'entregado', 'cancelado']),
  note: optionalText(300),
}).strict();
const trackQuery = z.object({
  token: z.string().max(64).optional(),
  phone4: z.string().regex(/^\d{4}$/).optional(),
});
const orderNumberParam = z.object({ orderNumber: z.string().regex(/^ORD-\d{4}-\d{4,8}$/, 'Número de pedido inválido') });
const customerCancel = z.object({ token: z.string().max(64).optional(), reason: optionalText(300) }).strict();

// ---------- Pagos ----------
const proofBody = z.object({ reference: optionalText(120), token: z.string().max(64).optional() });
const paymentReview = z.object({
  decision: z.enum(['verificado', 'rechazado']),
  reason: optionalText(300),
  cash_received_cents: cents.optional(),
}).strict();
const refund = z.object({ reason: z.string().trim().min(3).max(300) }).strict();
const paymentsQuery = z.object({
  status: z.enum(['pendiente', 'en_verificacion', 'verificado', 'rechazado', 'reembolsado']).optional(),
  method: z.enum(['qr', 'cash', 'card']).optional(),
  from: date.optional(),
  to: date.optional(),
  ...pagination,
});
const paymentMethod = z.object({
  type: z.enum(['qr', 'cash', 'card']).optional(),
  name: z.string().trim().min(1).max(100).optional(),
  active: z.boolean().optional(),
  display_order: z.coerce.number().int().min(0).max(100).optional(),
  config: z.object({
    instructions: z.string().max(500).optional(),
    instructions_en: z.string().max(500).optional(),
    instructions_fr: z.string().max(500).optional(),
    // Solo imágenes del propio almacenamiento (local o bucket configurado)
    qr_image: z.string().max(500).refine((v) => v === '' || isOwnPublicUrl(v), 'Usa una imagen subida').optional(),
    account_holder: z.string().max(150).optional(),
    bank: z.string().max(150).optional(),
    cash_on_pickup: z.boolean().optional(),
    cash_on_delivery: z.boolean().optional(),
  }).strict().optional(),
  translations: z.object({ en: z.object({ name: z.string().max(100) }).partial().optional(), fr: z.object({ name: z.string().max(100) }).partial().optional() }).optional(),
}).strict();
const cardTest = z.object({ outcome: z.enum(['approved', 'declined']), token: z.string().max(64).optional() }).strict();

// ---------- Monedas ----------
const currencyCode = z.object({ code: z.string().regex(/^[A-Z]{3}$/) });
const currencyUpdate = z.object({ enabled: z.boolean().optional(), name: z.string().trim().max(60).optional(), symbol: z.string().trim().max(8).optional() }).strict();
const rate = z.object({
  quote_code: z.string().regex(/^[A-Z]{3}$/),
  rate: z.string().regex(/^\d{1,10}(\.\d{1,8})?$/, 'Tasa con hasta 8 decimales').refine((v) => Number(v) > 0, 'Debe ser mayor que 0'),
  rate_type: z.enum(['oficial', 'comercial', 'manual']),
  source: z.string().trim().min(2).max(255),
  notes: optionalText(500),
  effective_at: z.coerce.date().optional(),
}).strict();

// ---------- Entregas ----------
const zone = z.object({
  name: z.string().trim().min(1).max(100),
  cost_cents: cents,
  estimated_time_minutes: z.coerce.number().int().min(1).max(600).default(30),
  active: z.boolean().optional(),
}).strict();

// ---------- Inventario ----------
const inventoryItem = z.object({
  name: z.string().trim().min(1).max(150),
  unit: z.enum(['g', 'kg', 'ml', 'l', 'unidad']),
  min_quantity: z.coerce.number().min(0).max(10_000_000).optional(),
  cost_per_unit_cents: z.coerce.number().min(0).max(10_000_000).optional().nullable(),
  supplier_id: id.optional().nullable(),
  tracks_expiry: z.boolean().optional(),
  active: z.boolean().optional(),
}).strict();
const movement = z.object({
  target: z.enum(['product', 'item']),
  id,
  type: z.enum(['entrada', 'ajuste', 'merma', 'devolucion']),
  quantity: z.coerce.number().positive().max(10_000_000).optional(),
  counted_quantity: z.coerce.number().min(0).max(10_000_000).optional(),
  unit_cost_cents: z.coerce.number().min(0).max(10_000_000).optional(),
  reason: optionalText(300),
  supplier_id: id.optional().nullable(),
  expires_at: date.optional().nullable(),
}).strict()
  .refine((m) => (m.type === 'ajuste' ? m.counted_quantity !== undefined : m.quantity !== undefined), 'Indica la cantidad');
const movementsQuery = z.object({
  product_id: id.optional(), item_id: id.optional(),
  type: z.enum(['entrada', 'venta', 'ajuste', 'merma', 'anulacion_venta', 'devolucion']).optional(),
  from: date.optional(), to: date.optional(), ...pagination,
});
const supplier = z.object({
  name: z.string().trim().min(1).max(150),
  contact: optionalText(150), phone: optionalText(30),
  email: z.string().trim().email().max(150).optional().nullable().or(z.literal('').transform(() => null)),
  notes: optionalText(500), active: z.boolean().optional(),
}).strict();

// ---------- Analítica / reportes ----------
const analyticsQuery = z.object({
  period: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'semiannual', 'annual', 'custom']).default('monthly'),
  date: date.optional(),
  from: date.optional(),
  to: date.optional(),
  categoryId: id.optional(),
  productId: id.optional(),
  paymentMethodId: id.optional(),
  locale: locale.optional(),
});
const reportParams = z.object({
  type: z.enum(['sales', 'orders', 'products', 'categories', 'inventory', 'movements', 'top_products', 'bottom_products',
    'payment_methods', 'cancellations', 'refunds', 'margins', 'audit', 'comparison']),
  format: z.enum(['pdf', 'xlsx']),
});

// ---------- Contenido / imágenes / privacidad ----------
const page = z.object({ title: z.string().trim().min(1).max(200), body: z.string().max(50000) }).strict();
const pageParams = z.object({
  slug: z.enum(['history', 'facilities', 'faq', 'privacy', 'cookies', 'terms', 'refunds', 'order-conditions']),
  locale,
});
const imageMeta = z.object({
  entity_type: z.enum(['product', 'banner', 'gallery', 'logo', 'favicon', 'qr', 'hero', 'facility', 'category']),
  entity_id: id.optional(),
  alt_text: optionalText(255),
  is_primary: bool.optional(),
  is_illustrative: bool.optional(),
  source: optionalText(255),
  license: optionalText(255),
  display_order: z.coerce.number().int().min(0).max(1000).optional(),
});
const imageUpdate = z.object({
  alt_text: optionalText(255), display_order: z.coerce.number().int().min(0).max(1000).optional(),
  is_illustrative: z.boolean().optional(), source: optionalText(255), license: optionalText(255),
}).strict();
const imagesQuery = z.object({ entity_type: imageMeta.shape.entity_type.optional(), entity_id: id.optional() });
const consent = z.object({
  consent_id: z.string().regex(/^[a-zA-Z0-9-]{16,64}$/),
  analytics: z.boolean(),
  marketing: z.boolean(),
  policy_version: z.string().max(20),
}).strict();
const auditQuery = z.object({ entity: z.string().max(40).optional(), user_id: id.optional(), from: date.optional(), to: date.optional(), ...pagination });

module.exports = {
  id, idParam, register, login, profile, changePassword, deleteAccount, adminUserUpdate, createStaff, usersQuery,
  category, productCreate, productUpdate, productsQuery, components, promotion,
  orderCreate, orderQuote, ordersQuery, orderStatus, trackQuery, orderNumberParam, customerCancel,
  proofBody, paymentReview, refund, paymentsQuery, paymentMethod, cardTest,
  currencyCode, currencyUpdate, rate, zone,
  inventoryItem, movement, movementsQuery, supplier,
  analyticsQuery, reportParams, page, pageParams, imageMeta, imageUpdate, imagesQuery, consent, auditQuery,
};
