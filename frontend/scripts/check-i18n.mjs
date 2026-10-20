#!/usr/bin/env node
// Verifica la integridad de las traducciones:
//  1. Toda clave t('...') usada en el código existe en es/en/fr (considerando plurales _one/_other).
//  2. Las claves dinámicas t(`prefijo.${x}`) tienen todas sus variantes conocidas.
//  3. Los tres archivos tienen exactamente el mismo conjunto de claves.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../src/', import.meta.url));
const locales = Object.fromEntries(['es', 'en', 'fr'].map((l) => [l, JSON.parse(readFileSync(join(root, 'i18n/locales', `${l}.json`), 'utf8'))]));

function flatten(obj, prefix = '', out = new Set()) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object') flatten(v, key, out);
    else out.add(key);
  }
  return out;
}
const keys = Object.fromEntries(Object.entries(locales).map(([l, o]) => [l, flatten(o)]));
const has = (l, k) => keys[l].has(k) || (keys[l].has(`${k}_one`) && keys[l].has(`${k}_other`));

function files(dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : /\.(tsx?|jsx?)$/.test(f) ? [p] : [];
  });
}

const used = new Set();
for (const f of files(root)) {
  const src = readFileSync(f, 'utf8');
  for (const m of src.matchAll(/\bt\(\s*'([a-zA-Z0-9_.-]+)'/g)) used.add(m[1]);
  for (const m of src.matchAll(/\bkey: '([a-z]+\.[a-zA-Z.]+)'/g)) used.add(m[1]);
  for (const m of src.matchAll(/\['\/[a-z-]*', '([a-z]+\.[a-zA-Z]+)'\]/g)) used.add(m[1]);
}

// Claves dinámicas: prefijo → valores posibles
const DYNAMIC = {
  'status': ['pendiente', 'confirmado', 'en_preparacion', 'listo', 'en_camino', 'entregado', 'cancelado'],
  'paymentStatus': ['pendiente', 'en_verificacion', 'pagado', 'verificado', 'rechazado', 'reembolsado'],
  'payment.type': ['qr', 'cash', 'card'],
  'checkout.methodHint': ['qr', 'cash', 'card'],
  'days': ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
  'roles': ['client', 'manager', 'admin'],
  'currency.types': ['oficial', 'comercial', 'manual'],
  'menu.sorts': ['recommended', 'popular', 'price_asc', 'price_desc', 'newest', 'name'],
  'legal': ['privacy', 'cookies', 'terms', 'refunds', 'orderConditions'],
  'content.eyebrow': ['history', 'facilities', 'faq'],
  'admin.period': ['daily', 'weekly', 'monthly', 'quarterly', 'semiannual', 'annual', 'custom'],
  'admin.fields': ['name', 'description', 'ingredients', 'product', 'category'],
  'admin.images.types': ['facility', 'gallery', 'banner', 'hero', 'logo', 'favicon', 'qr'],
  'admin.inventory.types': ['entrada', 'venta', 'ajuste', 'merma', 'anulacion_venta', 'devolucion'],
  'admin.inventory.target': ['item', 'product'],
  'admin.inventory.supplierFields': ['name', 'contact', 'phone', 'email', 'notes'],
  'admin.payments': ['verifyTitle', 'rejectTitle', 'refundTitle'],
  'admin.reports.types': ['sales', 'orders', 'products', 'categories', 'top_products', 'bottom_products', 'payment_methods', 'inventory', 'movements', 'cancellations', 'refunds', 'margins', 'comparison', 'audit'],
  'admin.reports.desc': ['sales', 'orders', 'products', 'categories', 'top_products', 'bottom_products', 'payment_methods', 'inventory', 'movements', 'cancellations', 'refunds', 'margins', 'comparison', 'audit'],
  'admin.settings.palettes': ['espresso', 'cacao', 'olivo', 'noche'],
  'admin.settings.tabs': ['business', 'hours', 'brand', 'orders', 'payments', 'privacy'],
  'admin.content.pages': ['history', 'facilities', 'faq', 'privacy', 'cookies', 'terms', 'refunds', 'order-conditions'],
  'admin.content': ['edit', 'preview'],
};
for (const [prefix, values] of Object.entries(DYNAMIC)) for (const v of values) used.add(`${prefix}.${v}`);

let errors = 0;
for (const k of [...used].sort()) {
  for (const l of Object.keys(locales)) {
    if (!has(l, k)) { console.error(`✖ Falta "${k}" en ${l}.json`); errors++; }
  }
}
for (const l of ['en', 'fr']) {
  for (const k of keys.es) if (!keys[l].has(k)) { console.error(`✖ "${k}" existe en es pero no en ${l}`); errors++; }
  for (const k of keys[l]) if (!keys.es.has(k)) { console.error(`✖ "${k}" existe en ${l} pero no en es`); errors++; }
}
if (errors) { console.error(`\n${errors} problema(s) de traducción.`); process.exit(1); }
console.log(`✔ i18n OK: ${used.size} claves usadas, ${keys.es.size} claves por idioma (es/en/fr).`);
