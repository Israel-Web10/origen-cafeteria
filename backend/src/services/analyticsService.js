// Analítica para decisiones del negocio. Todo sale de consultas reales a la BD.
// Las "estimaciones" (proyección de demanda) se marcan explícitamente como tales
// y solo se calculan si hay historial suficiente.
const { query, one } = require('../config/db');
const settingsService = require('./settingsService');
const periods = require('./periods');

// Fragmento común: pedidos válidos (no cancelados) en un rango local [from, to)
const RANGE = (fromIdx, toIdx, tzIdx) =>
  `o.created_at >= ($${fromIdx}::date)::timestamp AT TIME ZONE $${tzIdx}
   AND o.created_at <  ($${toIdx}::date)::timestamp AT TIME ZONE $${tzIdx}`;

function filterSql(f, startIdx) {
  const clauses = [];
  const params = [];
  let i = startIdx;
  if (f.categoryId) { clauses.push(`oi.category_id = $${i++}`); params.push(f.categoryId); }
  if (f.productId) { clauses.push(`oi.product_id = $${i++}`); params.push(f.productId); }
  if (f.paymentMethodId) { clauses.push(`o.payment_method_id = $${i++}`); params.push(f.paymentMethodId); }
  return { sql: clauses.length ? ' AND ' + clauses.join(' AND ') : '', params };
}

async function kpis(range, tz, f) {
  const flt = filterSql(f, 4);
  const row = await one(
    `SELECT COALESCE(SUM(oi.subtotal_cents),0)::bigint AS revenue_cents,
            COUNT(DISTINCT o.id)::int AS orders,
            COALESCE(SUM(oi.quantity),0)::int AS units,
            COALESCE(SUM(oi.discount_cents),0)::bigint AS discounts_cents,
            COALESCE(SUM(CASE WHEN oi.unit_cost_cents IS NOT NULL THEN oi.subtotal_cents - oi.unit_cost_cents * oi.quantity END),0)::bigint AS margin_cents,
            COALESCE(SUM(CASE WHEN oi.unit_cost_cents IS NOT NULL THEN oi.subtotal_cents END),0)::bigint AS revenue_with_cost_cents
       FROM orders o JOIN order_items oi ON oi.order_id = o.id
      WHERE o.status <> 'cancelado' AND ${RANGE(1, 2, 3)} ${flt.sql}`,
    [range.from, range.to, tz, ...flt.params]
  );
  const totals = await one(
    `SELECT COALESCE(SUM(o.total_cents),0)::bigint AS billed_cents,
            COALESCE(SUM(o.delivery_fee_cents),0)::bigint AS delivery_cents,
            COUNT(*) FILTER (WHERE o.payment_status = 'pagado')::int AS paid_orders
       FROM orders o
      WHERE o.status <> 'cancelado' AND ${RANGE(1, 2, 3)}
        AND ($4::int IS NULL OR o.payment_method_id = $4)
        AND ($5::int IS NULL AND $6::int IS NULL OR EXISTS (
              SELECT 1 FROM order_items oi WHERE oi.order_id = o.id
                AND ($5::int IS NULL OR oi.category_id = $5) AND ($6::int IS NULL OR oi.product_id = $6)))`,
    [range.from, range.to, tz, f.paymentMethodId ?? null, f.categoryId ?? null, f.productId ?? null]
  );
  const cancelled = await one(
    `SELECT COUNT(*)::int AS orders, COALESCE(SUM(total_cents),0)::bigint AS value_cents
       FROM orders o WHERE o.status = 'cancelado' AND ${RANGE(1, 2, 3)}`,
    [range.from, range.to, tz]
  );
  const refunds = await one(
    `SELECT COUNT(*)::int AS count, COALESCE(SUM(p.amount_cents),0)::bigint AS value_cents
       FROM payments p JOIN orders o ON o.id = p.order_id
      WHERE p.status = 'reembolsado' AND ${RANGE(1, 2, 3)}`,
    [range.from, range.to, tz]
  );
  const coverage = row.revenue_cents > 0 ? row.revenue_with_cost_cents / row.revenue_cents : 0;
  return {
    revenue_cents: row.revenue_cents,
    billed_cents: totals.billed_cents,
    delivery_cents: totals.delivery_cents,
    discounts_cents: row.discounts_cents,
    orders: row.orders,
    paid_orders: totals.paid_orders,
    units: row.units,
    avg_ticket_cents: row.orders ? Math.round(row.revenue_cents / row.orders) : 0,
    cancelled,
    refunds,
    // Margen solo si al menos el 80% de las ventas tiene costo registrado
    margin: coverage >= 0.8
      ? { cents: row.margin_cents, coverage, estimated: true }
      : { cents: null, coverage, estimated: true, reason: 'insufficient_cost_data' },
  };
}

async function dailySeries(range, tz, f) {
  const flt = filterSql(f, 4);
  return query(
    `WITH days AS (
       SELECT d::date AS day FROM generate_series($1::date, ($2::date - 1), interval '1 day') d
     ), sales AS (
       SELECT (o.created_at AT TIME ZONE $3)::date AS day,
              SUM(oi.subtotal_cents)::bigint AS revenue_cents, COUNT(DISTINCT o.id)::int AS orders
         FROM orders o JOIN order_items oi ON oi.order_id = o.id
        WHERE o.status <> 'cancelado' AND ${RANGE(1, 2, 3)} ${flt.sql}
        GROUP BY 1
     )
     SELECT to_char(days.day, 'YYYY-MM-DD') AS date, COALESCE(s.revenue_cents,0)::bigint AS revenue_cents, COALESCE(s.orders,0)::int AS orders
       FROM days LEFT JOIN sales s ON s.day = days.day ORDER BY days.day`,
    [range.from, range.to, tz, ...flt.params]
  );
}

function movingAverage(series, window = 7) {
  return series.map((p, i) => {
    if (i + 1 < window) return { date: p.date, value: null };
    const slice = series.slice(i + 1 - window, i + 1);
    return { date: p.date, value: Math.round(slice.reduce((s, x) => s + x.revenue_cents, 0) / window) };
  });
}

/** Días cuya venta se aparta más de 2 desviaciones de la media móvil previa de 28 días. */
function anomalies(series) {
  const out = [];
  for (let i = 14; i < series.length; i++) {
    const prev = series.slice(Math.max(0, i - 28), i).map((x) => x.revenue_cents);
    const mean = prev.reduce((a, b) => a + b, 0) / prev.length;
    const sd = Math.sqrt(prev.reduce((a, b) => a + (b - mean) ** 2, 0) / prev.length);
    if (sd === 0) continue;
    const z = (series[i].revenue_cents - mean) / sd;
    if (Math.abs(z) >= 2) out.push({ date: series[i].date, revenue_cents: series[i].revenue_cents, expected_cents: Math.round(mean), z: Math.round(z * 100) / 100 });
  }
  return out;
}

async function byHourAndWeekday(range, tz, f) {
  const flt = filterSql(f, 4);
  const rows = await query(
    `SELECT EXTRACT(ISODOW FROM o.created_at AT TIME ZONE $3)::int AS dow,
            EXTRACT(HOUR FROM o.created_at AT TIME ZONE $3)::int AS hour,
            COUNT(DISTINCT o.id)::int AS orders, SUM(oi.subtotal_cents)::bigint AS revenue_cents
       FROM orders o JOIN order_items oi ON oi.order_id = o.id
      WHERE o.status <> 'cancelado' AND ${RANGE(1, 2, 3)} ${flt.sql}
      GROUP BY 1, 2`,
    [range.from, range.to, tz, ...flt.params]
  );
  const hours = Array.from({ length: 24 }, (_, h) => ({ hour: h, orders: 0, revenue_cents: 0 }));
  const weekdays = Array.from({ length: 7 }, (_, d) => ({ dow: d + 1, orders: 0, revenue_cents: 0 }));
  for (const r of rows) {
    hours[r.hour].orders += r.orders; hours[r.hour].revenue_cents += r.revenue_cents;
    weekdays[r.dow - 1].orders += r.orders; weekdays[r.dow - 1].revenue_cents += r.revenue_cents;
  }
  return { hours, weekdays, heatmap: rows };
}

async function byCategory(range, tz, f) {
  const flt = filterSql({ ...f, categoryId: null }, 4);
  return query(
    `SELECT COALESCE(c.id, 0) AS id, COALESCE(c.name, 'Sin categoría') AS name,
            SUM(oi.subtotal_cents)::bigint AS revenue_cents, SUM(oi.quantity)::int AS units
       FROM orders o JOIN order_items oi ON oi.order_id = o.id LEFT JOIN categories c ON c.id = oi.category_id
      WHERE o.status <> 'cancelado' AND ${RANGE(1, 2, 3)} ${flt.sql}
      GROUP BY 1, 2 ORDER BY revenue_cents DESC`,
    [range.from, range.to, tz, ...flt.params]
  );
}

async function productRanking(range, tz, f) {
  const flt = filterSql({ ...f, productId: null }, 4);
  const sold = await query(
    `SELECT oi.product_id AS id, MAX(oi.product_name) AS name, SUM(oi.quantity)::int AS units,
            SUM(oi.subtotal_cents)::bigint AS revenue_cents
       FROM orders o JOIN order_items oi ON oi.order_id = o.id
      WHERE o.status <> 'cancelado' AND ${RANGE(1, 2, 3)} ${flt.sql}
      GROUP BY oi.product_id ORDER BY revenue_cents DESC`,
    [range.from, range.to, tz, ...flt.params]
  );
  // Productos activos sin ninguna venta en el periodo (baja rotación real)
  const unsold = await query(
    `SELECT p.id, p.name, 0 AS units, 0 AS revenue_cents FROM products p
      WHERE p.active AND ($1::int IS NULL OR p.category_id = $1) AND NOT (p.id = ANY($2::int[]))
      ORDER BY p.name`,
    [f.categoryId ?? null, sold.map((s) => s.id).filter(Boolean)]
  );
  // Clasificación ABC por ingresos (A: 80% acumulado, B: hasta 95%, C: resto)
  const total = sold.reduce((s, p) => s + p.revenue_cents, 0);
  let acc = 0;
  const abc = sold.map((p) => {
    acc += p.revenue_cents;
    const share = total ? acc / total : 0;
    return { ...p, share: total ? p.revenue_cents / total : 0, class: share <= 0.8 || acc === p.revenue_cents ? 'A' : share <= 0.95 ? 'B' : 'C' };
  });
  return {
    top: abc.slice(0, 10),
    bottom: [...unsold, ...[...abc].reverse()].slice(0, 10),
    abc,
  };
}

async function byPaymentMethod(range, tz, f) {
  return query(
    `SELECT pm.id, pm.name, pm.type, COUNT(*)::int AS orders, SUM(o.total_cents)::bigint AS total_cents,
            COUNT(*) FILTER (WHERE o.payment_status = 'pagado')::int AS paid
       FROM orders o JOIN payment_methods pm ON pm.id = o.payment_method_id
      WHERE o.status <> 'cancelado' AND ${RANGE(1, 2, 3)}
        AND ($4::int IS NULL AND $5::int IS NULL OR EXISTS (
              SELECT 1 FROM order_items oi WHERE oi.order_id = o.id
                AND ($4::int IS NULL OR oi.category_id = $4) AND ($5::int IS NULL OR oi.product_id = $5)))
      GROUP BY pm.id, pm.name, pm.type ORDER BY total_cents DESC`,
    [range.from, range.to, tz, f.categoryId ?? null, f.productId ?? null]
  );
}

/**
 * Proyección de demanda para los próximos 7 días: promedio de los últimos
 * 4 días equivalentes (mismo día de la semana), con rango mín–máx.
 * Requiere al menos 28 días con ventas en las últimas 8 semanas.
 */
async function forecast(tz) {
  const today = periods.todayIn(tz);
  const start = periods.fmt(periods.addDays(periods.parseDate(today), -56));
  const history = await dailySeries({ from: start, to: today }, tz, {});
  const activeDays = history.filter((d) => d.orders > 0).length;
  if (activeDays < 28) {
    return {
      available: false,
      reason: 'insufficient_history',
      required_days: 28,
      active_days: activeDays,
      message: 'Se necesitan al menos 28 días con ventas en las últimas 8 semanas para estimar la demanda.',
    };
  }
  const byDow = new Map();
  for (const d of history) {
    const dow = new Date(`${d.date}T00:00:00Z`).getUTCDay();
    if (!byDow.has(dow)) byDow.set(dow, []);
    byDow.get(dow).push(d.revenue_cents);
  }
  const next = [];
  for (let i = 0; i < 7; i++) {
    const date = periods.addDays(periods.parseDate(today), i);
    const sample = (byDow.get(date.getUTCDay()) || []).slice(-4);
    const avg = sample.length ? Math.round(sample.reduce((a, b) => a + b, 0) / sample.length) : 0;
    next.push({ date: periods.fmt(date), expected_cents: avg, low_cents: Math.min(...sample), high_cents: Math.max(...sample) });
  }
  return { available: true, method: 'seasonal_average_4_weeks', estimated: true, days: next };
}

/** Rotación y cobertura de insumos: consumo diario medio (28 días) y días de cobertura. */
async function inventoryHealth() {
  const items = await query(
    `SELECT ii.id, ii.name, ii.unit, ii.quantity::text AS quantity, ii.min_quantity::text AS min_quantity,
            COALESCE(-SUM(m.quantity_delta) FILTER (WHERE m.type IN ('venta','anulacion_venta')), 0)::text AS consumed_28d
       FROM inventory_items ii
       LEFT JOIN stock_movements m ON m.inventory_item_id = ii.id AND m.created_at >= now() - interval '28 days'
      WHERE ii.active GROUP BY ii.id ORDER BY ii.name`
  );
  return items.map((it) => {
    const daily = Number(it.consumed_28d) / 28;
    return { ...it, daily_consumption: Math.round(daily * 1000) / 1000, coverage_days: daily > 0 ? Math.floor(Number(it.quantity) / daily) : null, low: Number(it.quantity) <= Number(it.min_quantity) };
  });
}

async function summary(params) {
  const settings = await settingsService.getAll();
  const tz = settings.timezone;
  const range = periods.resolve({ ...params, timezone: tz });
  const f = { categoryId: params.categoryId, productId: params.productId, paymentMethodId: params.paymentMethodId };
  // Si el periodo está en curso, se compara contra el tramo equivalente "hasta la fecha"
  const prevRange = range.toDate ? range.toDate.previous : range.previous;
  const yoyRange = range.toDate ? range.toDate.previousYear : range.previousYear;
  const [current, previous, previousYear, series, time, categories, products, methods, fc, inventory, totalDays] = await Promise.all([
    kpis(range, tz, f),
    kpis(prevRange, tz, f),
    kpis(yoyRange, tz, f),
    dailySeries(range, tz, f),
    byHourAndWeekday(range, tz, f),
    byCategory(range, tz, f),
    productRanking(range, tz, f),
    byPaymentMethod(range, tz, f),
    forecast(tz),
    inventoryHealth(),
    one(`SELECT COUNT(DISTINCT (created_at AT TIME ZONE $1)::date)::int AS n FROM orders WHERE status <> 'cancelado'`, [tz]),
  ]);
  const change = (a, b) => (b ? (a - b) / b : null);
  return {
    range,
    filters: f,
    currency: (await one('SELECT code FROM currencies WHERE is_base')).code,
    kpis: current,
    comparison: {
      basis: range.toDate ? 'to_date' : 'full_period',
      previous_range: prevRange,
      previous: { kpis: previous, revenue_change: change(current.revenue_cents, previous.revenue_cents), orders_change: change(current.orders, previous.orders) },
      previous_year: previousYear.orders
        ? { kpis: previousYear, revenue_change: change(current.revenue_cents, previousYear.revenue_cents), orders_change: change(current.orders, previousYear.orders) }
        : { available: false, reason: 'no_data_previous_year' },
    },
    series,
    moving_average_7d: movingAverage(series),
    anomalies: series.length >= 21 ? anomalies(series) : [],
    time,
    categories,
    products,
    payment_methods: methods,
    forecast: fc,
    inventory,
    data_quality: { days_with_sales_total: totalDays.n },
  };
}

module.exports = { summary, dailySeries, kpis, byCategory, productRanking, byPaymentMethod, inventoryHealth, movingAverage, anomalies };
