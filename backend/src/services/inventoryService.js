// Inventario integral:
//  - Productos con control por unidades (products.stock, entero)
//  - Insumos/ingredientes (inventory_items.quantity, NUMERIC en su unidad)
//  - Recetas (product_components): una venta descuenta los insumos correspondientes
//  - Movimientos inmutables (stock_movements). Nunca se borran: los errores se
//    corrigen con un ajuste nuevo que deja constancia de motivo, usuario y fecha.
// Toda la aritmética de cantidades se hace en SQL (NUMERIC exacto), no en JS.
const { query, one, withTransaction } = require('../config/db');
const { badRequest, notFound, conflict } = require('../utils/errors');
const audit = require('./auditService');

// ---------- Ventas (llamado dentro de la transacción del pedido) ----------

async function consumeForOrder(client, orderId, lines, userId) {
  // a) Productos con stock por unidades (ya bloqueados FOR UPDATE por el pedido)
  const perProduct = new Map();
  for (const l of lines) perProduct.set(l.product.id, (perProduct.get(l.product.id) || 0) + l.quantity);
  for (const [productId, qty] of [...perProduct].sort((a, b) => a[0] - b[0])) {
    const row = await one(
      'UPDATE products SET stock = stock - $2 WHERE id = $1 AND stock IS NOT NULL AND stock >= $2 RETURNING stock',
      [productId, qty],
      client
    );
    const tracked = await one('SELECT stock FROM products WHERE id = $1', [productId], client);
    if (tracked.stock === null) continue;
    if (!row) throw conflict('insufficient_stock', 'Stock insuficiente.');
    await client.query(
      `INSERT INTO stock_movements (product_id, type, quantity_delta, balance_after, order_id, created_by, reason)
       VALUES ($1, 'venta', $2, $3, $4, $5, 'Venta')`,
      [productId, -qty, row.stock, orderId, userId]
    );
  }

  // b) Insumos según receta (componentes generales + específicos de la variante)
  const required = await query(
    `WITH lines(product_id, variant_id, qty) AS (SELECT * FROM unnest($1::int[], $2::int[], $3::int[]))
     SELECT pc.inventory_item_id AS id, SUM(pc.quantity * l.qty)::text AS required
       FROM lines l
       JOIN product_components pc
         ON pc.product_id = l.product_id AND (pc.variant_id IS NULL OR pc.variant_id = l.variant_id)
      GROUP BY pc.inventory_item_id
      ORDER BY pc.inventory_item_id`,
    [lines.map((l) => l.product.id), lines.map((l) => l.variant?.id ?? null), lines.map((l) => l.quantity)],
    client
  );
  if (!required.length) return;
  // Bloqueo en orden de id para evitar interbloqueos
  await client.query('SELECT id FROM inventory_items WHERE id = ANY($1::int[]) ORDER BY id FOR UPDATE', [required.map((r) => r.id)]);
  for (const r of required) {
    const row = await one(
      `UPDATE inventory_items SET quantity = quantity - $2::numeric
        WHERE id = $1 AND quantity >= $2::numeric RETURNING quantity::text AS quantity, cost_per_unit_cents::text AS cost, name`,
      [r.id, r.required],
      client
    );
    if (!row) {
      const item = await one('SELECT name FROM inventory_items WHERE id = $1', [r.id], client);
      throw conflict('insufficient_ingredients', `No hay insumos suficientes (${item?.name ?? r.id}) para preparar este pedido.`);
    }
    await client.query(
      `INSERT INTO stock_movements (inventory_item_id, type, quantity_delta, balance_after, unit_cost_cents, order_id, created_by, reason)
       VALUES ($1, 'venta', -($2::numeric), $3::numeric, $4::numeric, $5, $6, 'Consumo por receta')`,
      [r.id, r.required, row.quantity, row.cost, orderId, userId]
    );
  }
}

/** Revierte los movimientos de venta de un pedido cancelado (una sola vez). */
async function restoreForOrder(client, orderId, userId) {
  const already = await one("SELECT 1 FROM stock_movements WHERE order_id = $1 AND type = 'anulacion_venta' LIMIT 1", [orderId], client);
  if (already) return;
  const sales = await query(
    `SELECT product_id, inventory_item_id, SUM(quantity_delta)::text AS delta
       FROM stock_movements WHERE order_id = $1 AND type = 'venta'
      GROUP BY product_id, inventory_item_id
      ORDER BY product_id NULLS LAST, inventory_item_id NULLS LAST`,
    [orderId],
    client
  );
  for (const s of sales) {
    if (s.product_id) {
      const row = await one('UPDATE products SET stock = stock - $2::numeric::int WHERE id = $1 AND stock IS NOT NULL RETURNING stock', [s.product_id, s.delta], client);
      if (!row) continue; // dejó de controlarse por unidades
      await client.query(
        `INSERT INTO stock_movements (product_id, type, quantity_delta, balance_after, order_id, created_by, reason)
         VALUES ($1, 'anulacion_venta', -($2::numeric), $3, $4, $5, 'Pedido cancelado')`,
        [s.product_id, s.delta, row.stock, orderId, userId]
      );
    } else if (s.inventory_item_id) {
      const row = await one(
        'UPDATE inventory_items SET quantity = quantity - $2::numeric WHERE id = $1 RETURNING quantity::text AS quantity',
        [s.inventory_item_id, s.delta],
        client
      );
      if (!row) continue;
      await client.query(
        `INSERT INTO stock_movements (inventory_item_id, type, quantity_delta, balance_after, order_id, created_by, reason)
         VALUES ($1, 'anulacion_venta', -($2::numeric), $3::numeric, $4, $5, 'Pedido cancelado')`,
        [s.inventory_item_id, s.delta, row.quantity, orderId, userId]
      );
    }
  }
}

// ---------- Operaciones manuales del personal ----------

/**
 * Registra un movimiento manual.
 *  target: 'product' | 'item'
 *  type: 'entrada' | 'ajuste' | 'merma' | 'devolucion'
 *  quantity: cantidad positiva (entrada/merma/devolución)
 *  counted_quantity: para 'ajuste', conteo físico; el sistema calcula la diferencia
 */
async function recordMovement(input, req) {
  const { target, id, type, reason } = input;
  if (['ajuste', 'merma'].includes(type) && !reason) throw badRequest('reason_required', 'Indica el motivo del ajuste o la merma.');
  return withTransaction(async (client) => {
    if (target === 'product') {
      const p = await one('SELECT id, name, stock FROM products WHERE id = $1 FOR UPDATE', [id], client);
      if (!p) throw notFound('product_not_found', 'Producto no encontrado.');
      if (p.stock === null) throw badRequest('stock_not_tracked', 'Este producto no controla stock por unidades. Actívalo primero.');
      const qty = type === 'ajuste' ? null : Number(input.quantity);
      if (qty !== null && !Number.isInteger(qty)) throw badRequest('quantity_integer', 'Los productos se cuentan en unidades enteras.');
      let delta;
      if (type === 'ajuste') {
        if (!Number.isInteger(Number(input.counted_quantity))) throw badRequest('quantity_integer', 'Conteo inválido.');
        delta = Number(input.counted_quantity) - p.stock;
      } else delta = type === 'merma' ? -qty : qty;
      if (delta === 0) throw badRequest('no_change', 'El conteo coincide con el stock actual; no hay nada que ajustar.');
      const row = await one('UPDATE products SET stock = stock + $2 WHERE id = $1 AND stock + $2 >= 0 RETURNING stock', [id, delta], client);
      if (!row) throw conflict('negative_stock', 'El movimiento dejaría el stock en negativo.');
      const mov = await one(
        `INSERT INTO stock_movements (product_id, type, quantity_delta, balance_after, unit_cost_cents, reason, supplier_id, expires_at, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
        [id, type, delta, row.stock, input.unit_cost_cents ?? null, reason ?? null, input.supplier_id ?? null, input.expires_at ?? null, req.user.id],
        client
      );
      await audit.record({ req, action: `inventory.${type}`, entity: 'product', entityId: id, before: { stock: p.stock }, after: { stock: row.stock, reason } }, client);
      return mov;
    }

    const item = await one('SELECT id, name, quantity::text AS quantity FROM inventory_items WHERE id = $1 FOR UPDATE', [id], client);
    if (!item) throw notFound('item_not_found', 'Insumo no encontrado.');
    let deltaSql;
    let deltaParam;
    if (type === 'ajuste') {
      deltaSql = '($2::numeric - quantity)';
      deltaParam = String(input.counted_quantity);
    } else {
      deltaSql = type === 'merma' ? '(-$2::numeric)' : '($2::numeric)';
      deltaParam = String(input.quantity);
    }
    const delta = await one(`SELECT ${deltaSql}::text AS d FROM inventory_items WHERE id = $1`, [id, deltaParam], client);
    if (Number(delta.d) === 0) throw badRequest('no_change', 'El conteo coincide con la existencia actual.');
    // Entrada con costo: actualizar costo promedio ponderado
    const costUpdate = type === 'entrada' && input.unit_cost_cents != null
      ? `, cost_per_unit_cents = CASE WHEN quantity + $2::numeric > 0
           THEN (COALESCE(cost_per_unit_cents, $3::numeric) * quantity + $3::numeric * $2::numeric) / (quantity + $2::numeric)
           ELSE $3::numeric END`
      : '';
    const params = type === 'entrada' && input.unit_cost_cents != null ? [id, delta.d, String(input.unit_cost_cents)] : [id, delta.d];
    const row = await one(
      `UPDATE inventory_items SET quantity = quantity + $2::numeric ${costUpdate}
        WHERE id = $1 AND quantity + $2::numeric >= 0 RETURNING quantity::text AS quantity`,
      params,
      client
    );
    if (!row) throw conflict('negative_stock', 'El movimiento dejaría la existencia en negativo.');
    const mov = await one(
      `INSERT INTO stock_movements (inventory_item_id, type, quantity_delta, balance_after, unit_cost_cents, reason, supplier_id, expires_at, created_by)
       VALUES ($1,$2,$3::numeric,$4::numeric,$5,$6,$7,$8,$9) RETURNING *`,
      [id, type, delta.d, row.quantity, input.unit_cost_cents ?? null, reason ?? null, input.supplier_id ?? null, input.expires_at ?? null, req.user.id],
      client
    );
    await audit.record({ req, action: `inventory.${type}`, entity: 'inventory_item', entityId: id, before: { quantity: item.quantity }, after: { quantity: row.quantity, reason } }, client);
    return mov;
  });
}

// ---------- Consultas ----------

async function listItems({ includeInactive = false } = {}) {
  return query(
    `SELECT ii.*, ii.quantity::text AS quantity, ii.min_quantity::text AS min_quantity,
            ii.cost_per_unit_cents::text AS cost_per_unit_cents, s.name AS supplier_name,
            (ii.quantity <= ii.min_quantity) AS low,
            (SELECT COUNT(*)::int FROM product_components pc WHERE pc.inventory_item_id = ii.id) AS used_in
       FROM inventory_items ii LEFT JOIN suppliers s ON s.id = ii.supplier_id
      WHERE $1 OR ii.active
      ORDER BY (ii.quantity <= ii.min_quantity) DESC, ii.name`,
    [includeInactive]
  );
}

async function saveItem(id, data, req) {
  return withTransaction(async (client) => {
    const before = id ? await one('SELECT * FROM inventory_items WHERE id = $1 FOR UPDATE', [id], client) : null;
    if (id && !before) throw notFound('item_not_found', 'Insumo no encontrado.');
    let after;
    if (id) {
      if (before.unit !== data.unit) {
        const used = await one('SELECT 1 FROM stock_movements WHERE inventory_item_id = $1 LIMIT 1', [id], client);
        if (used) throw badRequest('unit_locked', 'No se puede cambiar la unidad de un insumo con movimientos registrados.');
      }
      after = await one(
        `UPDATE inventory_items SET name=$2, unit=$3, min_quantity=$4, supplier_id=$5, tracks_expiry=$6, active=$7
          WHERE id=$1 RETURNING *`,
        [id, data.name, data.unit, data.min_quantity ?? 0, data.supplier_id ?? null, data.tracks_expiry ?? false, data.active ?? true],
        client
      );
    } else {
      after = await one(
        `INSERT INTO inventory_items (name, unit, min_quantity, supplier_id, tracks_expiry, active, cost_per_unit_cents)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [data.name, data.unit, data.min_quantity ?? 0, data.supplier_id ?? null, data.tracks_expiry ?? false, data.active ?? true, data.cost_per_unit_cents ?? null],
        client
      );
    }
    await audit.record({ req, action: id ? 'inventory_item.update' : 'inventory_item.create', entity: 'inventory_item', entityId: after.id, before, after }, client);
    return after;
  });
}

async function listMovements({ productId, itemId, type, from, to, limit = 100, offset = 0 }) {
  const rows = await query(
    `SELECT m.*, m.quantity_delta::text AS quantity_delta, m.balance_after::text AS balance_after,
            m.unit_cost_cents::text AS unit_cost_cents,
            p.name AS product_name, ii.name AS item_name, ii.unit, u.name AS user_name, o.order_number,
            COUNT(*) OVER()::int AS total_count
       FROM stock_movements m
       LEFT JOIN products p ON p.id = m.product_id
       LEFT JOIN inventory_items ii ON ii.id = m.inventory_item_id
       LEFT JOIN users u ON u.id = m.created_by
       LEFT JOIN orders o ON o.id = m.order_id
      WHERE ($1::int IS NULL OR m.product_id = $1)
        AND ($2::int IS NULL OR m.inventory_item_id = $2)
        AND ($3::text IS NULL OR m.type = $3)
        AND ($4::timestamptz IS NULL OR m.created_at >= $4)
        AND ($5::timestamptz IS NULL OR m.created_at < $5)
      ORDER BY m.created_at DESC, m.id DESC
      LIMIT $6 OFFSET $7`,
    [productId ?? null, itemId ?? null, type ?? null, from ?? null, to ?? null, limit, offset]
  );
  return { movements: rows.map(({ total_count: _total, ...r }) => r), total: rows[0]?.total_count ?? 0 };
}

/** Alertas de reposición: productos e insumos en o bajo el mínimo. */
async function lowStock() {
  const products = await query(
    `SELECT id, name, stock, low_stock_threshold FROM products
      WHERE active AND stock IS NOT NULL AND stock <= low_stock_threshold ORDER BY stock, name`
  );
  const items = await query(
    `SELECT id, name, unit, quantity::text AS quantity, min_quantity::text AS min_quantity FROM inventory_items
      WHERE active AND quantity <= min_quantity ORDER BY (quantity / NULLIF(min_quantity, 0)) NULLS FIRST, name`
  );
  return { products, items };
}

/**
 * Entradas con fecha de vencimiento dentro de `days` días. Es una aproximación
 * por lote de entrada: el sistema no asigna consumos a lotes concretos (FEFO),
 * así que indica lotes a revisar físicamente, no cantidades exactas restantes.
 */
async function expiring(days = 14) {
  return query(
    `SELECT m.id, m.expires_at, m.quantity_delta::text AS quantity, m.created_at,
            COALESCE(ii.name, p.name) AS name, ii.unit
       FROM stock_movements m
       LEFT JOIN inventory_items ii ON ii.id = m.inventory_item_id
       LEFT JOIN products p ON p.id = m.product_id
      WHERE m.type = 'entrada' AND m.expires_at IS NOT NULL
        AND m.expires_at <= (CURRENT_DATE + $1::int)
        AND m.expires_at >= CURRENT_DATE - 7
      ORDER BY m.expires_at`,
    [days]
  );
}

// ---------- Proveedores ----------

async function listSuppliers() {
  return query('SELECT * FROM suppliers ORDER BY active DESC, name');
}

async function saveSupplier(id, data, req) {
  return withTransaction(async (client) => {
    const before = id ? await one('SELECT * FROM suppliers WHERE id = $1', [id], client) : null;
    if (id && !before) throw notFound('supplier_not_found', 'Proveedor no encontrado.');
    const params = [data.name, data.contact ?? null, data.phone ?? null, data.email ?? null, data.notes ?? null, data.active ?? true];
    const after = id
      ? await one('UPDATE suppliers SET name=$1, contact=$2, phone=$3, email=$4, notes=$5, active=$6 WHERE id=$7 RETURNING *', [...params, id], client)
      : await one('INSERT INTO suppliers (name, contact, phone, email, notes, active) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *', params, client);
    await audit.record({ req, action: id ? 'supplier.update' : 'supplier.create', entity: 'supplier', entityId: after.id, before, after }, client);
    return after;
  });
}

module.exports = {
  consumeForOrder, restoreForOrder, recordMovement, listItems, saveItem, listMovements, lowStock, expiring,
  listSuppliers, saveSupplier,
};
