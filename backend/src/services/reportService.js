// Reportes profesionales generados en el BACKEND desde la base de datos.
// Cada tipo produce una estructura común { title, columns, rows, totals, chart }
// que luego se renderiza a PDF (PDFKit) o Excel (ExcelJS) en streaming.
// El navegador nunca recibe todas las ventas para armar un informe.
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const { query, one } = require('../config/db');
const env = require('../config/env');
const settingsService = require('./settingsService');
const periods = require('./periods');
const analytics = require('./analyticsService');
const storage = require('./storageService');
const { labels } = require('../i18n/reports');
const { badRequest } = require('../utils/errors');

const TYPES = ['sales', 'orders', 'products', 'categories', 'inventory', 'movements', 'top_products', 'bottom_products',
  'payment_methods', 'cancellations', 'refunds', 'margins', 'audit', 'comparison'];

const RANGE_SQL = (col, a, b, tz) =>
  `${col} >= ($${a}::date)::timestamp AT TIME ZONE $${tz} AND ${col} < ($${b}::date)::timestamp AT TIME ZONE $${tz}`;

async function build(type, params, user) {
  if (!TYPES.includes(type)) throw badRequest('report_invalid', 'Tipo de reporte inválido.');
  const settings = await settingsService.getAll();
  const tz = settings.timezone;
  const L = labels(params.locale);
  const range = periods.resolve({ ...params, timezone: tz });
  const f = { categoryId: params.categoryId, productId: params.productId, paymentMethodId: params.paymentMethodId };
  const max = env.REPORT_MAX_ROWS;
  const base = (await one('SELECT code FROM currencies WHERE is_base')).code;
  const c = L.col;
  let columns;
  let rows;
  let chart = null;
  let notes = [];

  switch (type) {
    case 'sales': {
      rows = await analytics.dailySeries(range, tz, f);
      columns = [{ key: 'date', label: c.date }, { key: 'orders', label: c.orders, type: 'int', sum: true }, { key: 'revenue_cents', label: c.revenue, type: 'money', sum: true }];
      chart = { labels: rows.map((r) => r.date.slice(5)), values: rows.map((r) => r.revenue_cents) };
      break;
    }
    case 'orders':
    case 'cancellations': {
      rows = await query(
        `SELECT o.order_number, to_char(o.created_at AT TIME ZONE $3, 'YYYY-MM-DD HH24:MI') AS date, o.customer_name,
                o.status, o.payment_status, pm.name AS method, o.total_cents, o.cancel_reason
           FROM orders o JOIN payment_methods pm ON pm.id = o.payment_method_id
          WHERE ${RANGE_SQL('o.created_at', 1, 2, 3)}
            AND ($4::boolean IS FALSE OR o.status = 'cancelado')
            AND ($5::int IS NULL OR o.payment_method_id = $5)
          ORDER BY o.created_at LIMIT $6`,
        [range.from, range.to, tz, type === 'cancellations', f.paymentMethodId ?? null, max + 1]
      );
      rows = rows.map((r) => ({ ...r, status: L.statuses[r.status] || r.status, payment_status: L.payStatuses[r.payment_status] || r.payment_status }));
      columns = [
        { key: 'order_number', label: c.order_number }, { key: 'date', label: c.date }, { key: 'customer_name', label: c.customer },
        { key: 'status', label: c.status }, { key: 'payment_status', label: c.payment_status }, { key: 'method', label: c.method },
        { key: 'total_cents', label: c.total, type: 'money', sum: true },
      ];
      if (type === 'cancellations') columns.push({ key: 'cancel_reason', label: c.cancel_reason });
      break;
    }
    case 'products':
    case 'top_products':
    case 'bottom_products': {
      const ranking = await analytics.productRanking(range, tz, f);
      rows = type === 'products' ? ranking.abc : type === 'top_products' ? ranking.top : ranking.bottom;
      rows = rows.map((r) => ({ ...r, class: r.class || '—' }));
      columns = [{ key: 'name', label: c.product }, { key: 'units', label: c.units, type: 'int', sum: true },
        { key: 'revenue_cents', label: c.revenue, type: 'money', sum: true }, { key: 'share', label: c.share, type: 'percent' },
        { key: 'class', label: c.abc }];
      chart = { labels: rows.slice(0, 12).map((r) => r.name), values: rows.slice(0, 12).map((r) => r.revenue_cents), horizontal: true };
      break;
    }
    case 'categories': {
      rows = await analytics.byCategory(range, tz, f);
      columns = [{ key: 'name', label: c.category }, { key: 'units', label: c.units, type: 'int', sum: true }, { key: 'revenue_cents', label: c.revenue, type: 'money', sum: true }];
      chart = { labels: rows.map((r) => r.name), values: rows.map((r) => r.revenue_cents), horizontal: true };
      break;
    }
    case 'payment_methods': {
      rows = await analytics.byPaymentMethod(range, tz, f);
      columns = [{ key: 'name', label: c.method }, { key: 'orders', label: c.orders, type: 'int', sum: true },
        { key: 'paid', label: c.paid, type: 'int', sum: true }, { key: 'total_cents', label: c.total, type: 'money', sum: true }];
      chart = { labels: rows.map((r) => r.name), values: rows.map((r) => r.total_cents), horizontal: true };
      break;
    }
    case 'inventory': {
      const health = await analytics.inventoryHealth();
      const products = await query(`SELECT name, 'unidad' AS unit, stock::text AS quantity, low_stock_threshold::text AS min_quantity, (stock <= low_stock_threshold) AS low
                                      FROM products WHERE active AND stock IS NOT NULL ORDER BY name`);
      rows = [...health.map((h) => ({ ...h, coverage_days: h.coverage_days ?? '—' })), ...products.map((p) => ({ ...p, coverage_days: '—' }))]
        .map((r) => ({ ...r, quantity: Number(r.quantity), min_quantity: Number(r.min_quantity), low: r.low ? c.yes : c.no }));
      columns = [{ key: 'name', label: c.item }, { key: 'unit', label: c.unit }, { key: 'quantity', label: c.quantity, type: 'number' },
        { key: 'min_quantity', label: c.min, type: 'number' }, { key: 'low', label: c.low }, { key: 'coverage_days', label: c.coverage }];
      break;
    }
    case 'movements': {
      rows = await query(
        `SELECT to_char(m.created_at AT TIME ZONE $3, 'YYYY-MM-DD HH24:MI') AS date, COALESCE(p.name, ii.name) AS name,
                COALESCE(ii.unit, 'unidad') AS unit, m.type, m.quantity_delta::float8 AS delta, m.balance_after::float8 AS balance,
                COALESCE(m.reason, '') || CASE WHEN o.order_number IS NOT NULL THEN ' ' || o.order_number ELSE '' END AS reason,
                COALESCE(u.name, '') AS user_name
           FROM stock_movements m
           LEFT JOIN products p ON p.id = m.product_id
           LEFT JOIN inventory_items ii ON ii.id = m.inventory_item_id
           LEFT JOIN users u ON u.id = m.created_by
           LEFT JOIN orders o ON o.id = m.order_id
          WHERE ${RANGE_SQL('m.created_at', 1, 2, 3)}
          ORDER BY m.created_at, m.id LIMIT $4`,
        [range.from, range.to, tz, max + 1]
      );
      rows = rows.map((r) => ({ ...r, type: L.mtypes[r.type] || r.type }));
      columns = [{ key: 'date', label: c.date }, { key: 'name', label: c.item }, { key: 'unit', label: c.unit }, { key: 'type', label: c.type },
        { key: 'delta', label: c.delta, type: 'number' }, { key: 'balance', label: c.balance, type: 'number' },
        { key: 'reason', label: c.reason }, { key: 'user_name', label: L.user }];
      break;
    }
    case 'refunds': {
      rows = await query(
        `SELECT o.order_number, to_char(p.updated_at AT TIME ZONE $3, 'YYYY-MM-DD HH24:MI') AS date, p.method_type AS method,
                p.amount_cents, COALESCE(p.rejection_reason, '') AS reason
           FROM payments p JOIN orders o ON o.id = p.order_id
          WHERE p.status = 'reembolsado' AND ${RANGE_SQL('p.updated_at', 1, 2, 3)} ORDER BY p.updated_at LIMIT $4`,
        [range.from, range.to, tz, max + 1]
      );
      columns = [{ key: 'order_number', label: c.order_number }, { key: 'date', label: c.date }, { key: 'method', label: c.method },
        { key: 'amount_cents', label: c.amount, type: 'money', sum: true }, { key: 'reason', label: c.reason }];
      break;
    }
    case 'margins': {
      rows = await query(
        `SELECT MAX(oi.product_name) AS name, SUM(oi.quantity)::int AS units, SUM(oi.subtotal_cents)::bigint AS revenue_cents,
                SUM(oi.unit_cost_cents * oi.quantity)::bigint AS cost_cents,
                SUM(oi.subtotal_cents - oi.unit_cost_cents * oi.quantity)::bigint AS margin_cents
           FROM orders o JOIN order_items oi ON oi.order_id = o.id
          WHERE o.status <> 'cancelado' AND oi.unit_cost_cents IS NOT NULL AND ${RANGE_SQL('o.created_at', 1, 2, 3)}
          GROUP BY oi.product_id ORDER BY margin_cents DESC`,
        [range.from, range.to, tz]
      );
      rows = rows.map((r) => ({ ...r, margin_pct: r.revenue_cents ? r.margin_cents / r.revenue_cents : 0 }));
      columns = [{ key: 'name', label: c.product }, { key: 'units', label: c.units, type: 'int', sum: true },
        { key: 'revenue_cents', label: c.revenue, type: 'money', sum: true }, { key: 'cost_cents', label: c.cost, type: 'money', sum: true },
        { key: 'margin_cents', label: c.margin, type: 'money', sum: true }, { key: 'margin_pct', label: c.margin_pct, type: 'percent' }];
      notes.push(L.estimated);
      break;
    }
    case 'audit': {
      rows = await query(
        `SELECT to_char(a.created_at AT TIME ZONE $3, 'YYYY-MM-DD HH24:MI') AS date, COALESCE(u.name, '—') AS user_name,
                a.action, a.entity, COALESCE(a.entity_id, '') AS entity_id
           FROM audit_log a LEFT JOIN users u ON u.id = a.user_id
          WHERE ${RANGE_SQL('a.created_at', 1, 2, 3)} ORDER BY a.created_at LIMIT $4`,
        [range.from, range.to, tz, max + 1]
      );
      columns = [{ key: 'date', label: c.date }, { key: 'user_name', label: L.user }, { key: 'action', label: c.action },
        { key: 'entity', label: c.entity }, { key: 'entity_id', label: 'ID' }];
      break;
    }
    case 'comparison': {
      const [cur, prev, yoy] = await Promise.all([
        analytics.kpis(range, tz, f),
        analytics.kpis(range.toDate ? range.toDate.previous : range.previous, tz, f),
        analytics.kpis(range.toDate ? range.toDate.previousYear : range.previousYear, tz, f),
      ]);
      const pct = (a, b) => (b ? (a - b) / b : null);
      rows = [
        { metric: c.revenue, current: cur.revenue_cents, previous: prev.revenue_cents, yoy: yoy.revenue_cents, change: pct(cur.revenue_cents, prev.revenue_cents), money: true },
        { metric: c.orders, current: cur.orders, previous: prev.orders, yoy: yoy.orders, change: pct(cur.orders, prev.orders) },
        { metric: c.avg_ticket, current: cur.avg_ticket_cents, previous: prev.avg_ticket_cents, yoy: yoy.avg_ticket_cents, change: pct(cur.avg_ticket_cents, prev.avg_ticket_cents), money: true },
        { metric: c.units, current: cur.units, previous: prev.units, yoy: yoy.units, change: pct(cur.units, prev.units) },
        { metric: c.cancelled, current: cur.cancelled.orders, previous: prev.cancelled.orders, yoy: yoy.cancelled.orders, change: pct(cur.cancelled.orders, prev.cancelled.orders) },
      ];
      columns = [{ key: 'metric', label: c.metric }, { key: 'current', label: `${c.current} (${range.from} → ${range.lastDay})`, type: 'auto' },
        { key: 'previous', label: `${c.previous} (${range.previous.from})`, type: 'auto' },
        { key: 'yoy', label: `${range.previousYear.from.slice(0, 4)}`, type: 'auto' },
        { key: 'change', label: c.change, type: 'percent' }];
      break;
    }
    default: break;
  }

  let truncated = false;
  if (rows.length > max) { rows = rows.slice(0, max); truncated = true; notes.push(L.truncated.replace('{n}', max)); }
  const totals = {};
  for (const col of columns) if (col.sum) totals[col.key] = rows.reduce((s, r) => s + Number(r[col.key] || 0), 0);

  const filterDesc = [];
  if (f.categoryId) filterDesc.push(`${c.category}: ${(await one('SELECT name FROM categories WHERE id = $1', [f.categoryId]))?.name ?? f.categoryId}`);
  if (f.productId) filterDesc.push(`${c.product}: ${(await one('SELECT name FROM products WHERE id = $1', [f.productId]))?.name ?? f.productId}`);
  if (f.paymentMethodId) filterDesc.push(`${c.method}: ${(await one('SELECT name FROM payment_methods WHERE id = $1', [f.paymentMethodId]))?.name ?? f.paymentMethodId}`);

  return {
    type,
    logo: await logoBuffer(settings.logo_url),
    title: L.titles[type],
    L,
    locale: params.locale || 'es',
    business: { name: settings.business_name, legal: settings.legal_name, tax_id: settings.tax_id, logo_url: settings.logo_url },
    generatedAt: new Intl.DateTimeFormat(params.locale || 'es', { timeZone: tz, dateStyle: 'medium', timeStyle: 'short' }).format(new Date()),
    periodLabel: `${L.periods[range.period]}: ${range.from} → ${range.lastDay} (${tz})`,
    filters: filterDesc.length ? filterDesc.join(' · ') : L.none,
    user: `${user.name} (${user.email})`,
    currency: base,
    columns,
    rows,
    totals,
    truncated,
    notes,
    chart,
  };
}

// ---------------- Formateo ----------------

function fmtValue(report, col, row) {
  const v = row[col.key];
  const type = col.type === 'auto' ? (row.money ? 'money' : 'int') : col.type;
  if (v === null || v === undefined || v === '') return '—';
  const nf = (opts) => new Intl.NumberFormat(report.locale, opts).format(v);
  switch (type) {
    case 'money': return new Intl.NumberFormat(report.locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v / 100);
    case 'int': return nf({ maximumFractionDigits: 0 });
    case 'number': return nf({ maximumFractionDigits: 3 });
    case 'percent': return new Intl.NumberFormat(report.locale, { style: 'percent', maximumFractionDigits: 1 }).format(v);
    default: return String(v);
  }
}

async function logoBuffer(url) {
  const key = storage.keyFromPublicUrl(url);
  if (!key || key.endsWith('.webp')) return null; // PDFKit solo admite JPG/PNG
  const file = await storage.read('public', key);
  return file ? file.buffer : null;
}

// ---------------- PDF ----------------

// Las fuentes base de PDF (Helvetica, WinAnsi) no incluyen algunos caracteres
// que produce Intl (espacio fino del francés) ni flechas: se sustituyen.
function pdfText(value) {
  return String(value)
    .replace(/[\u202F\u00A0\u2009]/g, ' ')
    .replace(/\u2192/g, '-')
    .replace(/\u2248/g, '~')
    // eslint-disable-next-line no-control-regex -- se conservan tabulaci\u00f3n y saltos de l\u00ednea v\u00e1lidos
    .replace(/[^\x09\x0A\x0D\x20-\x7E\u00A0-\u00FF\u20AC\u2013\u2014\u2018\u2019\u201C\u201D\u2022\u2026]/g, '');
}

function renderPdf(report, stream) {
  const doc = new PDFDocument({ size: 'A4', layout: report.columns.length > 6 ? 'landscape' : 'portrait', margin: 40, bufferPages: true,
    info: { Title: report.title, Author: report.business.name, Creator: 'ORIGEN' } });
  doc.pipe(stream);
  const pageW = doc.page.width - 80;
  const brown = '#2A1A12';
  const gold = '#96702F';

  // Encabezado
  const logo = report.logo;
  let y = 40;
  if (logo) { try { doc.image(logo, 40, y, { fit: [56, 56] }); } catch { /* imagen no soportada */ } }
  const tx = logo ? 108 : 40;
  doc.fillColor(brown).font('Helvetica-Bold').fontSize(18).text(pdfText(report.business.name || 'ORIGEN'), tx, y);
  if (report.business.legal || report.business.tax_id) {
    doc.font('Helvetica').fontSize(8).fillColor('#555').text([report.business.legal, report.business.tax_id && `NIT ${report.business.tax_id}`].filter(Boolean).join(' · '), tx);
  }
  doc.font('Helvetica-Bold').fontSize(14).fillColor(gold).text(pdfText(report.title), tx, y + 34);
  y += 70;
  doc.font('Helvetica').fontSize(8.5).fillColor('#333');
  const meta = [
    `${report.L.period}: ${report.periodLabel}`,
    `${report.L.filters}: ${report.filters}`,
    `${report.L.generated_at}: ${report.generatedAt} · ${report.L.user}: ${report.user}`,
    `${report.L.records}: ${report.rows.length} · ${report.L.currency}: ${report.currency}`,
  ];
  for (const line of meta) { doc.text(pdfText(line), 40, y, { width: pageW }); y = doc.y + 1; }
  for (const n of report.notes) { doc.fillColor('#A63D40').text(pdfText(n), 40, y, { width: pageW }); y = doc.y + 1; }
  y += 8;

  // Gráfico de barras simple (si aplica y hay datos)
  if (report.chart && report.chart.values.some((v) => v > 0)) {
    const h = 130;
    const values = report.chart.values;
    const maxV = Math.max(...values);
    if (report.chart.horizontal) {
      const rowH = Math.min(14, h / values.length);
      values.forEach((v, i) => {
        const yy = y + i * rowH;
        doc.fillColor('#333').fontSize(7).text(pdfText(String(report.chart.labels[i]).slice(0, 28)), 40, yy + 2, { width: 130 });
        doc.rect(175, yy + 2, ((pageW - 220) * v) / maxV, rowH - 4).fill(gold);
        doc.fillColor('#333').fontSize(7).text(pdfText(fmtValue(report, { type: 'money', key: 'v' }, { v })), 180 + ((pageW - 220) * v) / maxV, yy + 2);
      });
      y += values.length * rowH + 12;
    } else {
      const bw = pageW / values.length;
      values.forEach((v, i) => {
        const bh = maxV ? (h * v) / maxV : 0;
        doc.rect(40 + i * bw + bw * 0.15, y + h - bh, bw * 0.7, bh).fill(gold);
      });
      doc.moveTo(40, y + h).lineTo(40 + pageW, y + h).strokeColor('#999').lineWidth(0.5).stroke();
      const step = Math.ceil(values.length / 12);
      doc.fontSize(6.5).fillColor('#555');
      report.chart.labels.forEach((l, i) => { if (i % step === 0) doc.text(pdfText(l), 40 + i * bw, y + h + 3, { width: bw * step, align: 'left' }); });
      y += h + 18;
    }
  }

  // Tabla
  const cols = report.columns;
  const widths = cols.map((col) => (['money', 'int', 'number', 'percent', 'auto'].includes(col.type) ? 1 : 2));
  const unit = pageW / widths.reduce((a, b) => a + b, 0);
  const xs = [];
  widths.reduce((x, w, i) => { xs[i] = x; return x + w * unit; }, 40);
  const bottom = doc.page.height - 50;
  const header = () => {
    doc.rect(40, y, pageW, 16).fill(brown);
    doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#F6EFE4');
    cols.forEach((col, i) => doc.text(pdfText(col.label), xs[i] + 3, y + 4, { width: widths[i] * unit - 6, height: 9, align: col.type ? 'right' : 'left', lineBreak: false, ellipsis: true }));
    y += 16;
    doc.font('Helvetica').fillColor('#222');
  };
  header();
  report.rows.forEach((row, ri) => {
    if (y + 14 > bottom) { doc.addPage(); y = 40; header(); }
    if (ri % 2) doc.rect(40, y, pageW, 14).fill('#F6EFE4').fillColor('#222');
    cols.forEach((col, i) => doc.fontSize(7.5).fillColor('#222').text(pdfText(fmtValue(report, col, row)), xs[i] + 3, y + 3.5,
      { width: widths[i] * unit - 6, height: 9, align: col.type ? 'right' : 'left', lineBreak: false, ellipsis: true }));
    y += 14;
  });
  if (Object.keys(report.totals).length) {
    if (y + 16 > bottom) { doc.addPage(); y = 40; }
    doc.rect(40, y, pageW, 16).fill('#E4D5BE');
    doc.font('Helvetica-Bold').fontSize(7.5).fillColor(brown).text(report.L.totals, xs[0] + 3, y + 4.5);
    cols.forEach((col, i) => {
      if (col.key in report.totals) doc.text(pdfText(fmtValue(report, col, report.totals)), xs[i] + 3, y + 4.5, { width: widths[i] * unit - 6, align: 'right', lineBreak: false });
    });
  }

  // Numeración de páginas
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(i);
    const bottomMargin = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    doc.font('Helvetica').fontSize(7).fillColor('#888')
      .text(pdfText(`${report.business.name} · ${report.title} · ${report.L.page} ${i + 1}/${range.count}`), 40, doc.page.height - 30, { width: pageW, align: 'center', lineBreak: false });
    doc.page.margins.bottom = bottomMargin;
  }
  doc.end();
}

// ---------------- Excel ----------------

async function renderXlsx(report, stream) {
  const wb = new ExcelJS.stream.xlsx.WorkbookWriter({ stream, useStyles: true });
  wb.creator = report.business.name;
  wb.created = new Date();
  const ws = wb.addWorksheet(report.title.slice(0, 31), { views: [{ state: 'frozen', ySplit: 8 }] });
  ws.columns = report.columns.map((col) => ({ key: col.key, width: col.type ? 16 : 30 }));
  ws.addRow([report.business.name]).font = { bold: true, size: 14 };
  ws.addRow([report.title]).font = { bold: true, size: 12, color: { argb: 'FF96702F' } };
  ws.addRow([`${report.L.period}: ${report.periodLabel}`]);
  ws.addRow([`${report.L.filters}: ${report.filters}`]);
  ws.addRow([`${report.L.generated_at}: ${report.generatedAt} · ${report.L.user}: ${report.user}`]);
  ws.addRow([`${report.L.records}: ${report.rows.length} · ${report.L.currency}: ${report.currency}${report.notes.length ? ' · ' + report.notes.join(' ') : ''}`]);
  ws.addRow([]);
  const head = ws.addRow(report.columns.map((c) => c.label));
  head.font = { bold: true, color: { argb: 'FFF6EFE4' } };
  head.eachCell((cell) => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2A1A12' } }; });
  head.commit();
  const toCell = (col, row) => {
    const v = row[col.key];
    const type = col.type === 'auto' ? (row.money ? 'money' : 'int') : col.type;
    if (v === null || v === undefined) return null;
    if (type === 'money') return Number(v) / 100;
    if (['int', 'number', 'percent'].includes(type)) return Number(v);
    return v;
  };
  for (const row of report.rows) {
    const r = ws.addRow(report.columns.map((col) => toCell(col, row)));
    report.columns.forEach((col, i) => {
      const type = col.type === 'auto' ? (row.money ? 'money' : 'int') : col.type;
      if (type === 'money') r.getCell(i + 1).numFmt = '#,##0.00';
      if (type === 'percent') r.getCell(i + 1).numFmt = '0.0%';
      if (type === 'int') r.getCell(i + 1).numFmt = '#,##0';
    });
    r.commit();
  }
  if (Object.keys(report.totals).length) {
    const t = ws.addRow(report.columns.map((col, i) => (i === 0 ? report.L.totals : col.key in report.totals ? toCell(col, report.totals) : null)));
    t.font = { bold: true };
    report.columns.forEach((col, i) => { if (col.type === 'money') t.getCell(i + 1).numFmt = '#,##0.00'; });
    t.commit();
  }
  ws.commit();
  await wb.commit();
}

module.exports = { build, renderPdf, renderXlsx, TYPES };
