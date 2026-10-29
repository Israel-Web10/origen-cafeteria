const test = require('node:test');
const assert = require('node:assert/strict');
process.env.JWT_SECRET = process.env.JWT_SECRET || 'x'.repeat(40);
const money = require('../src/utils/money');
const periods = require('../src/services/periods');
const { sniffImage, imageSize } = require('../src/services/storageService');
const { mergeItems } = require('../src/services/orderService');
const { movingAverage, anomalies, insights } = require('../src/services/analyticsService');

test('toCents convierte sin errores de punto flotante', () => {
  assert.equal(money.toCents('0.1'), 10);
  assert.equal(money.toCents('19.99'), 1999);
  assert.equal(money.toCents('1,5'), 150);
  assert.equal(money.toCents(12), 1200);
  assert.throws(() => money.toCents('1.999'));
  assert.throws(() => money.toCents('abc'));
});

test('convertCents usa aritmética exacta y redondeo half-up', () => {
  // 100.00 BOB a 0.14367816 USD/BOB = 14.367816 → 14.37
  assert.equal(money.convertCents(10000, '0.14367816'), 1437);
  assert.equal(money.convertCents(1, '0.5'), 1); // 0.005 → 0.01
  assert.equal(money.centsToDecimalString(-105), '-1.05');
  assert.equal(money.percentOf(1999, 10), 200);
});

test('periodos: límites semanales, trimestrales, semestrales y bisiestos', () => {
  const w = periods.resolve({ period: 'weekly', date: '2026-10-21' }); // miércoles
  assert.equal(w.from, '2026-10-19');
  assert.equal(w.to, '2026-10-26');
  const q = periods.resolve({ period: 'quarterly', date: '2026-11-30' });
  assert.deepEqual([q.from, q.to, q.previous.from], ['2026-10-01', '2027-01-01', '2026-07-01']);
  const s = periods.resolve({ period: 'semiannual', date: '2026-07-01' });
  assert.deepEqual([s.from, s.to], ['2026-07-01', '2027-01-01']);
  const leap = periods.resolve({ period: 'monthly', date: '2028-02-10' });
  assert.equal(leap.days, 29);
  const y = periods.resolve({ period: 'annual', date: '2026-05-05' });
  assert.deepEqual([y.from, y.to, y.previousYear.from], ['2026-01-01', '2027-01-01', '2025-01-01']);
  assert.throws(() => periods.resolve({ period: 'custom', from: '2026-05-10', to: '2026-05-01' }));
  assert.throws(() => periods.resolve({ period: 'custom', from: '2020-01-01', to: '2026-01-01' }));
});

test('detección de imágenes por firma binaria, no por extensión', () => {
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
  assert.deepEqual(sniffImage(png), { ext: 'png', mime: 'image/png' });
  assert.deepEqual(imageSize(png, 'png'), { width: 1, height: 1 });
  assert.equal(sniffImage(Buffer.from('<html><script>alert(1)</script></html>')), null);
  assert.equal(sniffImage(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>')), null);
  assert.equal(sniffImage(Buffer.from('GIF89a......')), null);
});

test('mergeItems agrupa líneas del mismo producto y variante', () => {
  const merged = mergeItems([
    { product_id: 1, quantity: 2 }, { product_id: 1, quantity: 3 }, { product_id: 1, variant_id: 5, quantity: 1 },
  ]);
  assert.equal(merged.length, 2);
  assert.equal(merged.find((m) => !m.variant_id).quantity, 5);
});

test('media móvil y anomalías', () => {
  const series = Array.from({ length: 30 }, (_, i) => ({ date: `d${i}`, revenue_cents: i === 25 ? 10000 : 1000 + (i % 3) * 10 }));
  const ma = movingAverage(series, 7);
  assert.equal(ma[5].value, null);
  assert.ok(ma[6].value > 0);
  const an = anomalies(series);
  assert.equal(an.length, 1);
  assert.equal(an[0].date, 'd25');
});

test('recomendaciones: reglas explicables y sin conclusiones con pocos datos', () => {
  const kpis = (o) => ({ revenue_cents: 100000, discounts_cents: 0, orders: 40, cancelled: { orders: 0 }, margin: { cents: 1, coverage: 1 }, ...o });
  const base = {
    kpis: kpis(),
    comparison: { previous: { kpis: kpis({ orders: 30 }), revenue_change: -0.25 } },
    time: {
      hours: Array.from({ length: 24 }, (_, h) => ({ hour: h, orders: h === 9 ? 20 : 1 })),
      weekdays: [1, 2, 3, 4, 5].map((dow) => ({ dow, orders: 5, revenue_cents: dow === 2 ? 1000 : 20000 })),
    },
    products: { top: [{ name: 'Espresso', share: 0.5 }], bottom: [{ name: 'Brownie', units: 0 }] },
    inventory: [{ name: 'Leche', low: true, coverage_days: 1 }, { name: 'Café', low: false, coverage_days: 2 }],
    anomalies: [],
  };
  const codes = insights(base).map((i) => i.code);
  for (const c of ['low_stock', 'stock_runout', 'revenue_drop', 'peak_hour', 'slow_weekday', 'concentration', 'unsold']) assert.ok(codes.includes(c), c);
  assert.equal(insights(base)[0].severity, 'warn');
  assert.equal(insights(base).find((i) => i.code === 'peak_hour').params.hour, 9);
  // Con 3 pedidos no se infieren tendencias ni horas pico
  const few = insights({ ...base, kpis: kpis({ orders: 3 }), comparison: { previous: { kpis: kpis({ orders: 2 }), revenue_change: -0.9 } }, inventory: [] });
  assert.deepEqual(few.map((i) => i.code), []);
  // Sin ventas: nada
  assert.deepEqual(insights({ ...base, kpis: kpis({ orders: 0 }) }), []);
});
