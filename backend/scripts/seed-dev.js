#!/usr/bin/env node
// Datos de DESARROLLO / DEMOSTRACIÓN. Nunca se ejecuta en producción.
//
//   npm run seed:dev                    catálogo, inventario, recetas y cuentas de prueba
//   npm run seed:dev -- --with-history  + ~60 días de pedidos SIMULADOS (marcados como demo)
//
// Cuentas de prueba (solo desarrollo):
//   admin@origen.dev / DevAdmin123!   gerente@origen.dev / DevManager123!   cliente@origen.dev / DevClient123!
require('dotenv').config();
if (process.env.NODE_ENV === 'production') {
  console.error('[seed-dev] Prohibido en producción.');
  process.exit(1);
}
process.env.JWT_SECRET = process.env.JWT_SECRET || 'x'.repeat(32);
const bcrypt = require('bcryptjs');
const { pool, one, query } = require('../src/config/db');

const DEV_USERS = [
  ['Administrador ORIGEN', 'admin@origen.dev', 'DevAdmin123!', 'admin', '70000000'],
  ['Gerente ORIGEN', 'gerente@origen.dev', 'DevManager123!', 'manager', '70000001'],
  ['Cliente de Prueba', 'cliente@origen.dev', 'DevClient123!', 'client', '70011111'],
];

const CATEGORIES = [
  ['Cafés', 'cafes', 'Espresso, americanos, capuchinos y más', { en: { name: 'Coffee' }, fr: { name: 'Cafés' } }],
  ['Chocolate y cacao', 'chocolate-y-cacao', 'Chocolates calientes y bebidas de cacao', { en: { name: 'Chocolate & cacao' }, fr: { name: 'Chocolat et cacao' } }],
  ['Bebidas frías', 'bebidas-frias', 'Frappés e iced coffee', { en: { name: 'Cold drinks' }, fr: { name: 'Boissons froides' } }],
  ['Repostería', 'reposteria', 'Horneado en casa', { en: { name: 'Bakery' }, fr: { name: 'Pâtisserie' } }],
  ['Desayunos', 'desayunos', 'Para empezar el día', { en: { name: 'Breakfast' }, fr: { name: 'Petit-déjeuner' } }],
];

// [categoría, nombre, descripción, precio Bs, costo Bs, stock|null, flags, traducciones, variantes, receta]
const PRODUCTS = [
  ['cafes', 'Espresso', 'Shot doble, tueste medio de altura.', 12, 3.2, null, { is_featured: true, prep: 3 },
    { en: { name: 'Espresso', description: 'Double shot, medium high-altitude roast.' }, fr: { name: 'Espresso', description: 'Double dose, torréfaction moyenne d\'altitude.' } },
    [], [['Café en grano', 18]]],
  ['cafes', 'Cappuccino', 'Espresso, leche vaporizada y espuma cremosa.', 18, 5.1, null, { is_featured: true, prep: 5 },
    { en: { name: 'Cappuccino', description: 'Espresso, steamed milk and creamy foam.' }, fr: { name: 'Cappuccino', description: 'Espresso, lait chaud et mousse onctueuse.' } },
    [['Mediano', 0], ['Grande', 400], ['Leche de almendra', 300]], [['Café en grano', 18], ['Leche entera', 180], ['Vasos para llevar', 1]]],
  ['cafes', 'Café Origen', 'Mezcla de la casa con notas a chocolate y frutos rojos.', 20, 5.5, null, { is_featured: true, is_new: true, prep: 6 },
    { en: { name: 'Origen Coffee', description: 'House blend with chocolate and red berry notes.' }, fr: { name: 'Café Origen', description: 'Mélange maison aux notes de chocolat et fruits rouges.' } },
    [], [['Café en grano', 20], ['Vasos para llevar', 1]]],
  ['chocolate-y-cacao', 'Chocolate caliente de cacao boliviano', 'Cacao 70 %, leche y un toque de canela.', 22, 7, null, { is_featured: true, prep: 6 },
    { en: { name: 'Bolivian cacao hot chocolate', description: '70% cacao, milk and a hint of cinnamon.' }, fr: { name: 'Chocolat chaud au cacao bolivien', description: 'Cacao 70 %, lait et une touche de cannelle.' } },
    [['Mediano', 0], ['Grande', 500]], [['Cacao 70%', 35], ['Leche entera', 220], ['Vasos para llevar', 1]]],
  ['chocolate-y-cacao', 'Mocaccino', 'Espresso con chocolate y leche.', 21, 6.4, null, { prep: 5 },
    { en: { name: 'Mocaccino' }, fr: { name: 'Mocaccino' } }, [], [['Café en grano', 18], ['Cacao 70%', 15], ['Leche entera', 150]]],
  ['bebidas-frias', 'Iced Latte', 'Espresso, leche fría y hielo.', 19, 5, null, { prep: 4 },
    { en: { name: 'Iced Latte' }, fr: { name: 'Latte glacé' } }, [], [['Café en grano', 18], ['Leche entera', 200]]],
  ['bebidas-frias', 'Frappé de caramelo', 'Café frappé con caramelo y crema.', 24, 7.5, null, { is_new: true, prep: 6 },
    { en: { name: 'Caramel frappé' }, fr: { name: 'Frappé caramel' } }, [], [['Café en grano', 18], ['Leche entera', 150]]],
  ['reposteria', 'Croissant de almendra', 'Relleno de crema de almendra.', 15, 6, 30, { prep: 1 },
    { en: { name: 'Almond croissant' }, fr: { name: 'Croissant aux amandes' } }, [], []],
  ['reposteria', 'Brownie de cacao', 'Brownie húmedo con cacao boliviano.', 14, 4.5, 25, { is_featured: true, prep: 1 },
    { en: { name: 'Cacao brownie' }, fr: { name: 'Brownie au cacao' } }, [], []],
  ['desayunos', 'Desayuno Origen', 'Huevos, pan artesanal, palta y café.', 38, 15, null, { prep: 12 },
    { en: { name: 'Origen breakfast' }, fr: { name: 'Petit-déjeuner Origen' } }, [], [['Café en grano', 18]]],
];

// Fotos de demostración (Unsplash License, ver docs/RECURSOS-Y-LICENCIAS.md)
const PRODUCT_IMAGES = {
  'Espresso': 'espresso', 'Cappuccino': 'cappuccino', 'Café Origen': 'cafe-origen',
  'Chocolate caliente de cacao boliviano': 'hot-chocolate', 'Mocaccino': 'mocaccino', 'Iced Latte': 'iced-latte',
  'Frappé de caramelo': 'frappe', 'Croissant de almendra': 'croissant', 'Brownie de cacao': 'brownie', 'Desayuno Origen': 'breakfast',
};
const CATEGORY_IMAGES = { cafes: 'latte-art', 'chocolate-y-cacao': 'hot-chocolate', 'bebidas-frias': 'iced-latte', reposteria: 'croissant', desayunos: 'breakfast' };
const media = (n) => (n ? `/media/menu/${n}.webp` : null);

const ITEMS = [
  ['Café en grano', 'g', 8000, 2000, 0.12],
  ['Leche entera', 'ml', 40000, 8000, 0.0085],
  ['Cacao 70%', 'g', 5000, 1000, 0.09],
  ['Vasos para llevar', 'unidad', 600, 150, 0.6],
];

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const [name, email, pass, role, phone] of DEV_USERS) {
      await client.query(
        `INSERT INTO users (name, email, password_hash, role, phone) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (lower(email)) DO NOTHING`,
        [name, email, await bcrypt.hash(pass, 10), role, phone]
      );
    }
    const admin = await one("SELECT id FROM users WHERE email = 'admin@origen.dev'", [], client);

    const exists = await one('SELECT COUNT(*)::int AS n FROM products', [], client);
    if (exists.n === 0) {
      const sup = await one(`INSERT INTO suppliers (name, contact, notes) VALUES ('Proveedor de ejemplo', 'Contacto demo', 'Datos de demostración') RETURNING id`, [], client);
      const itemIds = {};
      for (const [name, unit, qty, min, cost] of ITEMS) {
        const r = await one(
          `INSERT INTO inventory_items (name, unit, quantity, min_quantity, cost_per_unit_cents, supplier_id) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
          [name, unit, qty, min, cost * 100, sup.id], client);
        itemIds[name] = r.id;
        await client.query(
          `INSERT INTO stock_movements (inventory_item_id, type, quantity_delta, balance_after, unit_cost_cents, reason, created_by, supplier_id)
           VALUES ($1,'entrada',$2,$2,$3,'Stock inicial (demo)',$4,$5)`, [r.id, qty, cost * 100, admin.id, sup.id]);
      }
      const catIds = {};
      for (const [i, [name, slug, desc, tr]] of CATEGORIES.entries()) {
        const r = await one(`INSERT INTO categories (name, slug, description, display_order, translations, image_url) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
          [name, slug, desc, i + 1, tr, media(CATEGORY_IMAGES[slug])], client);
        catIds[slug] = r.id;
      }
      for (const [cat, name, desc, price, cost, stock, flags, tr, variants, recipe] of PRODUCTS) {
        const slug = name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '');
        const p = await one(
          `INSERT INTO products (category_id, name, slug, description, price_cents, cost_cents, stock, is_featured, is_new, prep_time_minutes, translations, image_url)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`,
          [catIds[cat], name, slug, desc, Math.round(price * 100), Math.round(cost * 100), stock, !!flags.is_featured, !!flags.is_new, flags.prep ?? null, tr, media(PRODUCT_IMAGES[name])], client);
        if (stock) {
          await client.query(`INSERT INTO stock_movements (product_id, type, quantity_delta, balance_after, reason, created_by) VALUES ($1,'entrada',$2,$2,'Stock inicial (demo)',$3)`, [p.id, stock, admin.id]);
        }
        for (const [i, [vname, delta]] of variants.entries()) {
          await client.query(`INSERT INTO product_variants (product_id, name, price_delta_cents, display_order) VALUES ($1,$2,$3,$4)`, [p.id, vname, delta, i]);
        }
        for (const [itemName, qty] of recipe) {
          await client.query(`INSERT INTO product_components (product_id, inventory_item_id, quantity) VALUES ($1,$2,$3)`, [p.id, itemIds[itemName], qty]);
        }
      }
      await client.query(`INSERT INTO delivery_zones (name, cost_cents, estimated_time_minutes) VALUES ('Zona Centro', 800, 25), ('Zona Sur', 1200, 40)`);
      await client.query(
        `INSERT INTO promotions (name, kind, value, category_id, starts_at, ends_at, translations)
         VALUES ('Semana del cacao', 'percent', 10, $1, now() - interval '1 day', now() + interval '30 days', '{"en":{"name":"Cacao week"},"fr":{"name":"Semaine du cacao"}}')`,
        [catIds['chocolate-y-cacao']]);
      await client.query(`INSERT INTO settings (key, value) VALUES
        ('address', 'Dirección de ejemplo (configurar en el panel)'), ('phone', '+591 70000000'), ('whatsapp', '+591 70000000'),
        ('delivery_enabled', 'true'), ('latitude', '-16.5000'), ('longitude', '-68.1500')
        ON CONFLICT (key) DO NOTHING`);
    }
    for (const [name, img] of Object.entries(PRODUCT_IMAGES)) {
      await client.query('UPDATE products SET image_url = $2 WHERE name = $1 AND image_url IS NULL', [name, media(img)]);
    }
    for (const [slug, img] of Object.entries(CATEGORY_IMAGES)) {
      await client.query('UPDATE categories SET image_url = $2 WHERE slug = $1 AND image_url IS NULL', [slug, media(img)]);
    }
    await client.query('COMMIT');
    console.log('Datos de desarrollo listos.');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  if (process.argv.includes('--with-history')) await simulateHistory();
  await pool.end();
}

/** Crea pedidos SIMULADOS con el servicio real y los fecha en los últimos 60 días. */
async function simulateHistory() {
  const orders = require('../src/services/orderService');
  const payments = require('../src/services/paymentService');
  const already = await one("SELECT COUNT(*)::int AS n FROM orders WHERE observations = 'DEMO'");
  if (already.n > 0) { console.log('El historial demo ya existe.'); return; }
  // Reponer insumos para que alcance el historial
  await query(`WITH u AS (UPDATE inventory_items SET quantity = quantity * 20 RETURNING id, quantity, quantity / 20 AS old)
               INSERT INTO stock_movements (inventory_item_id, type, quantity_delta, balance_after, reason)
               SELECT id, 'entrada', quantity - old, quantity, 'Reposición para historial demo' FROM u`);
  await query(`WITH u AS (UPDATE products SET stock = stock * 20 WHERE stock IS NOT NULL RETURNING id, stock, stock / 20 AS old)
               INSERT INTO stock_movements (product_id, type, quantity_delta, balance_after, reason)
               SELECT id, 'entrada', stock - old, stock, 'Reposición para historial demo' FROM u`);
  const products = await query('SELECT p.id, (SELECT MIN(v.id) FROM product_variants v WHERE v.product_id = p.id) AS variant_id FROM products p WHERE active');
  const cash = await one("SELECT id FROM payment_methods WHERE type = 'cash'");
  const admin = await one("SELECT id, role FROM users WHERE email = 'admin@origen.dev'");
  let rnd = 42;
  const rand = () => { rnd = (rnd * 1103515245 + 12345) % 2147483648; return rnd / 2147483648; };
  let created = 0;
  for (let day = 60; day >= 1; day--) {
    const weekday = new Date(Date.now() - day * 86400000).getDay();
    const n = 4 + Math.floor(rand() * 6) + (weekday === 6 || weekday === 0 ? 4 : 0);
    for (let k = 0; k < n; k++) {
      const lines = Array.from({ length: 1 + Math.floor(rand() * 3) }, () => {
        const p = products[Math.floor(rand() * products.length)];
        return { product_id: p.id, variant_id: p.variant_id, quantity: 1 + Math.floor(rand() * 2) };
      });
      const o = await orders.createOrder({
        customerName: 'Cliente Demo', customerPhone: '70000000', deliveryType: 'pickup', paymentMethodId: cash.id,
        items: lines, observations: 'DEMO', acceptTerms: true,
      }, { user: null });
      const hour = 7 + Math.floor(rand() * 12);
      const when = new Date(Date.now() - day * 86400000);
      when.setUTCHours(hour + 4, Math.floor(rand() * 60)); // La Paz = UTC-4
      if (rand() < 0.06) {
        await orders.changeStatus(o.id, 'cancelado', { user: admin, note: 'Demo' });
      } else {
        const pay = o.payments[0];
        await payments.review(pay.id, { decision: 'verificado', cash_received_cents: o.total_cents }, { user: admin });
        await query(`UPDATE orders SET status = 'entregado' WHERE id = $1`, [o.id]);
      }
      await query('UPDATE orders SET created_at = $2 WHERE id = $1', [o.id, when]);
      await query('UPDATE stock_movements SET created_at = $2 WHERE order_id = $1', [o.id, when]);
      created++;
    }
  }
  console.log(`Historial SIMULADO creado: ${created} pedidos (observación "DEMO").`);
}

main().catch(async (err) => {
  console.error('[seed-dev]', err);
  await pool.end().catch(() => {});
  process.exit(1);
});
