const { query, one, pool, withTransaction } = require('../config/db');
const { uniqueSlug } = require('../utils/slug');
const { badRequest, notFound } = require('../utils/errors');
const { percentOf } = require('../utils/money');
const audit = require('./auditService');

// ======================= Categorías =======================

async function listCategories({ includeInactive = false } = {}) {
  return query(
    `SELECT c.*,
            (SELECT COUNT(*)::int FROM products p WHERE p.category_id = c.id AND p.active) AS product_count
       FROM categories c
      WHERE ($1 OR c.active)
      ORDER BY c.display_order, c.name`,
    [includeInactive]
  );
}

async function getCategory(idOrSlug) {
  return one('SELECT * FROM categories WHERE id::text = $1 OR slug = $1', [String(idOrSlug)]);
}

async function createCategory(data, req) {
  return withTransaction(async (client) => {
    const slug = await uniqueSlug(client, 'categories', data.slug || data.name);
    const cat = await one(
      `INSERT INTO categories (name, slug, description, image_url, display_order, active, translations)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [data.name, slug, data.description ?? null, data.image_url ?? null, data.display_order ?? 0, data.active ?? true, data.translations ?? {}],
      client
    );
    await audit.record({ req, action: 'category.create', entity: 'category', entityId: cat.id, after: cat }, client);
    return cat;
  });
}

async function updateCategory(id, data, req) {
  return withTransaction(async (client) => {
    const before = await one('SELECT * FROM categories WHERE id = $1 FOR UPDATE', [id], client);
    if (!before) throw notFound('category_not_found', 'Categoría no encontrada.');
    const slug = data.slug || data.name ? await uniqueSlug(client, 'categories', data.slug || data.name, id) : before.slug;
    const after = await one(
      `UPDATE categories SET
         name = COALESCE($2, name), slug = $3, description = COALESCE($4, description),
         image_url = COALESCE($5, image_url), display_order = COALESCE($6, display_order),
         active = COALESCE($7, active), translations = COALESCE($8, translations)
       WHERE id = $1 RETURNING *`,
      [id, data.name ?? null, slug, data.description ?? null, data.image_url ?? null, data.display_order ?? null, data.active ?? null, data.translations ?? null],
      client
    );
    await audit.record({ req, action: 'category.update', entity: 'category', entityId: id, before, after }, client);
    return after;
  });
}

async function deleteCategory(id, req) {
  return withTransaction(async (client) => {
    const before = await one('SELECT * FROM categories WHERE id = $1', [id], client);
    if (!before) throw notFound('category_not_found', 'Categoría no encontrada.');
    await client.query('DELETE FROM categories WHERE id = $1', [id]); // FK RESTRICT si tiene productos
    await audit.record({ req, action: 'category.delete', entity: 'category', entityId: id, before }, client);
  });
}

// ======================= Productos =======================

// Columna calculada: cuántas unidades se pueden preparar con los insumos actuales
// (solo receta base, sin variante). NULL si el producto no tiene receta.
const MAX_BY_INGREDIENTS = `(
  SELECT MIN(FLOOR(ii.quantity / pc.quantity))::int
    FROM product_components pc JOIN inventory_items ii ON ii.id = pc.inventory_item_id
   WHERE pc.product_id = p.id AND pc.variant_id IS NULL
)`;

// Mejor promoción vigente (producto o su categoría)
const ACTIVE_PROMO = `(
  SELECT jsonb_build_object('id', pr.id, 'name', pr.name, 'kind', pr.kind, 'value', pr.value, 'ends_at', pr.ends_at, 'translations', pr.translations)
    FROM promotions pr
   WHERE pr.active AND now() >= pr.starts_at AND now() < pr.ends_at
     AND (pr.product_id = p.id OR pr.category_id = p.category_id)
   ORDER BY CASE WHEN pr.kind = 'percent' THEN p.price_cents * pr.value / 100 ELSE LEAST(pr.value, p.price_cents) END DESC
   LIMIT 1
)`;

const POPULARITY = `COALESCE((
  SELECT SUM(oi.quantity)::int FROM order_items oi JOIN orders o ON o.id = oi.order_id
   WHERE oi.product_id = p.id AND o.status <> 'cancelado' AND o.created_at >= now() - interval '90 days'
), 0)`;

function unitDiscount(priceCents, promo) {
  if (!promo) return 0;
  return promo.kind === 'percent' ? percentOf(priceCents, promo.value) : Math.min(promo.value, priceCents);
}

function shapeProduct(row, { staff = false } = {}) {
  const promo = row.promotion || null;
  const final = row.price_cents - unitDiscount(row.price_cents, promo);
  const inStock = row.stock === null || row.stock > 0;
  const ingredientsOk = row.max_by_ingredients === null || row.max_by_ingredients === undefined || row.max_by_ingredients > 0;
  const out = {
    ...row,
    final_price_cents: final,
    promotion: promo,
    purchasable: row.active && row.available && inStock && ingredientsOk,
  };
  if (!staff) {
    delete out.cost_cents;
    delete out.max_by_ingredients;
    delete out.low_stock_threshold;
  }
  return out;
}

const SORTS = {
  recommended: 'p.is_featured DESC, c.display_order, p.name',
  name: 'p.name',
  price_asc: 'p.price_cents ASC, p.name',
  price_desc: 'p.price_cents DESC, p.name',
  popular: 'popularity DESC, p.name',
  newest: 'p.created_at DESC',
};

async function listProducts({ staff = false, category, search, sort = 'recommended', featured, isNew, promo, limit = 100, offset = 0 } = {}) {
  const params = [];
  const where = ['TRUE'];
  if (!staff) where.push('p.active AND c.active');
  if (category) {
    params.push(String(category));
    where.push(`(c.id::text = $${params.length} OR c.slug = $${params.length})`);
  }
  if (search) {
    params.push(`%${search.toLowerCase().replace(/[\\%_]/g, (m) => '\\' + m)}%`);
    const i = params.length;
    where.push(`(lower(p.name) LIKE $${i} OR lower(COALESCE(p.description,'')) LIKE $${i} OR lower(p.translations::text) LIKE $${i} OR $${i} LIKE '%' || lower(array_to_string(p.tags, ' ')) || '%' AND cardinality(p.tags) > 0)`);
  }
  if (featured) where.push('p.is_featured');
  if (isNew) where.push('p.is_new');
  params.push(limit, offset);
  const rows = await query(
    `SELECT p.*, c.name AS category_name, c.slug AS category_slug, c.translations AS category_translations,
            ${ACTIVE_PROMO} AS promotion, ${POPULARITY} AS popularity, ${MAX_BY_INGREDIENTS} AS max_by_ingredients,
            COALESCE((SELECT jsonb_agg(v ORDER BY v.display_order, v.id) FROM product_variants v WHERE v.product_id = p.id AND (v.active OR $${params.length + 1})), '[]') AS variants
       FROM products p JOIN categories c ON c.id = p.category_id
      WHERE ${where.join(' AND ')}
      ORDER BY ${SORTS[sort] || SORTS.recommended}
      LIMIT $${params.length - 1} OFFSET $${params.length}`,
    [...params, staff]
  );
  let products = rows.map((r) => shapeProduct(r, { staff }));
  if (promo) products = products.filter((p) => p.promotion);
  return products;
}

async function getProduct(idOrSlug, { staff = false } = {}) {
  const row = await one(
    `SELECT p.*, c.name AS category_name, c.slug AS category_slug, c.translations AS category_translations,
            ${ACTIVE_PROMO} AS promotion, ${POPULARITY} AS popularity, ${MAX_BY_INGREDIENTS} AS max_by_ingredients,
            COALESCE((SELECT jsonb_agg(v ORDER BY v.display_order, v.id) FROM product_variants v WHERE v.product_id = p.id AND (v.active OR $2)), '[]') AS variants,
            COALESCE((SELECT jsonb_agg(jsonb_build_object('id', i.id, 'url', i.url, 'alt_text', i.alt_text) ORDER BY i.is_primary DESC, i.display_order, i.id)
                        FROM images i WHERE i.entity_type = 'product' AND i.entity_id = p.id), '[]') AS images
       FROM products p JOIN categories c ON c.id = p.category_id
      WHERE (p.id::text = $1 OR p.slug = $1) AND ($2 OR (p.active AND c.active))`,
    [String(idOrSlug), staff]
  );
  if (!row) return null;
  const product = shapeProduct(row, { staff });
  if (staff) {
    product.components = await query(
      `SELECT pc.*, pc.quantity::text AS quantity, ii.name AS item_name, ii.unit
         FROM product_components pc JOIN inventory_items ii ON ii.id = pc.inventory_item_id
        WHERE pc.product_id = $1 ORDER BY pc.variant_id NULLS FIRST, ii.name`,
      [row.id]
    );
  }
  return product;
}

const PRODUCT_FIELDS = [
  'category_id', 'name', 'description', 'ingredients', 'allergens', 'price_cents', 'cost_cents', 'image_url',
  'stock', 'low_stock_threshold', 'prep_time_minutes', 'is_new', 'is_featured', 'available', 'active', 'tags', 'translations',
];

async function createProduct(data, req) {
  return withTransaction(async (client) => {
    const slug = await uniqueSlug(client, 'products', data.slug || data.name);
    const cols = PRODUCT_FIELDS.filter((f) => data[f] !== undefined && f !== 'stock');
    const values = cols.map((f) => (f === 'translations' ? JSON.stringify(data[f]) : data[f]));
    const product = await one(
      `INSERT INTO products (slug, ${cols.join(', ')}, stock)
       VALUES ($1, ${cols.map((_, i) => `$${i + 2}`).join(', ')}, $${cols.length + 2}) RETURNING *`,
      [slug, ...values, data.stock ?? null],
      client
    );
    if (data.stock != null && data.stock > 0) {
      await client.query(
        `INSERT INTO stock_movements (product_id, type, quantity_delta, balance_after, reason, created_by)
         VALUES ($1, 'entrada', $2, $2, 'Stock inicial', $3)`,
        [product.id, data.stock, req.user.id]
      );
    }
    if (data.variants) await replaceVariants(client, product.id, data.variants);
    await audit.record({ req, action: 'product.create', entity: 'product', entityId: product.id, after: product }, client);
    return product;
  });
}

async function updateProduct(id, data, req) {
  return withTransaction(async (client) => {
    const before = await one('SELECT * FROM products WHERE id = $1 FOR UPDATE', [id], client);
    if (!before) throw notFound('product_not_found', 'Producto no encontrado.');
    // El stock NO se edita directamente: se cambia con movimientos de inventario trazables.
    // Excepción: activar/desactivar el control por unidades (stock NULL ↔ 0).
    const cols = PRODUCT_FIELDS.filter((f) => data[f] !== undefined && f !== 'stock');
    const sets = cols.map((f, i) => `${f} = $${i + 2}`);
    const values = cols.map((f) => (f === 'translations' ? JSON.stringify(data[f]) : data[f]));
    if (data.name && data.name !== before.name) {
      sets.push(`slug = $${values.length + 2}`);
      values.push(await uniqueSlug(client, 'products', data.name, id));
    }
    if (data.track_stock === false && before.stock !== null) sets.push('stock = NULL');
    if (data.track_stock === true && before.stock === null) sets.push('stock = 0');
    let after = before;
    if (sets.length) {
      after = await one(`UPDATE products SET ${sets.join(', ')} WHERE id = $1 RETURNING *`, [id, ...values], client);
    }
    if (data.variants) await replaceVariants(client, id, data.variants);
    await audit.record({ req, action: 'product.update', entity: 'product', entityId: id, before, after }, client);
    return after;
  });
}

/**
 * Sincroniza variantes: actualiza las que traen id, crea las nuevas y desactiva
 * (no borra) las omitidas, para no romper pedidos históricos que las referencian.
 */
async function replaceVariants(client, productId, variants) {
  const keep = [];
  for (const [index, v] of variants.entries()) {
    if (v.id) {
      const row = await one(
        `UPDATE product_variants SET name = $3, price_delta_cents = $4, active = $5, display_order = $6, translations = $7
          WHERE id = $1 AND product_id = $2 RETURNING id`,
        [v.id, productId, v.name, v.price_delta_cents ?? 0, v.active ?? true, index, JSON.stringify(v.translations ?? {})],
        client
      );
      if (!row) throw badRequest('variant_invalid', `La variante ${v.id} no pertenece a este producto.`);
      keep.push(row.id);
    } else {
      const row = await one(
        `INSERT INTO product_variants (product_id, name, price_delta_cents, active, display_order, translations)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
        [productId, v.name, v.price_delta_cents ?? 0, v.active ?? true, index, JSON.stringify(v.translations ?? {})],
        client
      );
      keep.push(row.id);
    }
  }
  await client.query(
    'UPDATE product_variants SET active = FALSE WHERE product_id = $1 AND NOT (id = ANY($2::int[]))',
    [productId, keep]
  );
}

async function deleteProduct(id, req) {
  return withTransaction(async (client) => {
    const before = await one('SELECT * FROM products WHERE id = $1', [id], client);
    if (!before) throw notFound('product_not_found', 'Producto no encontrado.');
    const sold = await one('SELECT 1 FROM order_items WHERE product_id = $1 LIMIT 1', [id], client);
    if (sold) {
      // Con ventas históricas se desactiva en lugar de borrar: los reportes siguen vinculados.
      await client.query('UPDATE products SET active = FALSE, available = FALSE WHERE id = $1', [id]);
      await audit.record({ req, action: 'product.deactivate', entity: 'product', entityId: id, before }, client);
      return { deactivated: true };
    }
    await client.query('DELETE FROM products WHERE id = $1', [id]);
    await audit.record({ req, action: 'product.delete', entity: 'product', entityId: id, before }, client);
    return { deleted: true };
  });
}

/** Reemplaza la receta (componentes) de un producto. */
async function setComponents(productId, components, req) {
  return withTransaction(async (client) => {
    const product = await one('SELECT id FROM products WHERE id = $1', [productId], client);
    if (!product) throw notFound('product_not_found', 'Producto no encontrado.');
    const before = await query('SELECT variant_id, inventory_item_id, quantity::text FROM product_components WHERE product_id = $1', [productId], client);
    await client.query('DELETE FROM product_components WHERE product_id = $1', [productId]);
    for (const c of components) {
      if (c.variant_id) {
        const v = await one('SELECT 1 FROM product_variants WHERE id = $1 AND product_id = $2', [c.variant_id, productId], client);
        if (!v) throw badRequest('variant_invalid', 'Variante inválida en la receta.');
      }
      await client.query(
        'INSERT INTO product_components (product_id, variant_id, inventory_item_id, quantity) VALUES ($1,$2,$3,$4)',
        [productId, c.variant_id ?? null, c.inventory_item_id, c.quantity]
      );
    }
    await audit.record({ req, action: 'product.recipe', entity: 'product', entityId: productId, before: { components: before }, after: { components } }, client);
  });
}

// ======================= Promociones =======================

async function listPromotions({ includeInactive = false } = {}) {
  return query(
    `SELECT pr.*, p.name AS product_name, c.name AS category_name,
            (pr.active AND now() >= pr.starts_at AND now() < pr.ends_at) AS running
       FROM promotions pr
       LEFT JOIN products p ON p.id = pr.product_id
       LEFT JOIN categories c ON c.id = pr.category_id
      WHERE $1 OR (pr.active AND now() < pr.ends_at)
      ORDER BY pr.starts_at DESC`,
    [includeInactive]
  );
}

async function savePromotion(id, data, req) {
  return withTransaction(async (client) => {
    const before = id ? await one('SELECT * FROM promotions WHERE id = $1', [id], client) : null;
    if (id && !before) throw notFound('promotion_not_found', 'Promoción no encontrada.');
    const params = [data.name, data.description ?? null, data.kind, data.value, data.product_id ?? null, data.category_id ?? null,
      data.starts_at, data.ends_at, data.active ?? true, JSON.stringify(data.translations ?? {})];
    const after = id
      ? await one(
          `UPDATE promotions SET name=$1, description=$2, kind=$3, value=$4, product_id=$5, category_id=$6,
                  starts_at=$7, ends_at=$8, active=$9, translations=$10 WHERE id=$11 RETURNING *`,
          [...params, id], client)
      : await one(
          `INSERT INTO promotions (name, description, kind, value, product_id, category_id, starts_at, ends_at, active, translations)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`, params, client);
    await audit.record({ req, action: id ? 'promotion.update' : 'promotion.create', entity: 'promotion', entityId: after.id, before, after }, client);
    return after;
  });
}

module.exports = {
  listCategories, getCategory, createCategory, updateCategory, deleteCategory,
  listProducts, getProduct, createProduct, updateProduct, deleteProduct, setComponents,
  listPromotions, savePromotion, unitDiscount, ACTIVE_PROMO,
  pool,
};
