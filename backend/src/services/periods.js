// Periodos de reporte en fechas LOCALES del negocio (YYYY-MM-DD).
// Todos los rangos son semiabiertos [from, to): `to` es el primer día fuera.
// La conversión a instantes UTC se hace en SQL con `($1::date)::timestamp AT TIME ZONE tz`,
// por lo que los límites de día/mes/año respetan la zona horaria configurada.
const { badRequest } = require('../utils/errors');

const PERIODS = ['daily', 'weekly', 'monthly', 'quarterly', 'semiannual', 'annual', 'custom'];

function parseDate(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
  if (!m) return null;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCMonth() === +m[2] - 1 ? d : null;
}
const fmt = (d) => d.toISOString().slice(0, 10);
const addDays = (d, n) => new Date(d.getTime() + n * 86400000);
const addMonths = (d, n) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1));

/** Fecha de hoy en la zona horaria del negocio. */
function todayIn(timezone) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  return parts; // en-CA => YYYY-MM-DD
}

function resolve({ period = 'monthly', date, from, to, timezone = 'America/La_Paz' }) {
  if (!PERIODS.includes(period)) throw badRequest('period_invalid', 'Periodo inválido.');
  let start;
  let end;
  if (period === 'custom') {
    start = parseDate(from);
    const last = parseDate(to);
    if (!start || !last) throw badRequest('date_invalid', 'Fechas inválidas (usa AAAA-MM-DD).');
    if (last < start) throw badRequest('date_range', 'La fecha final es anterior a la inicial.');
    end = addDays(last, 1);
    if ((end - start) / 86400000 > 366 * 3) throw badRequest('range_too_large', 'El rango máximo es de 3 años.');
  } else {
    const anchor = parseDate(date) || parseDate(todayIn(timezone));
    const y = anchor.getUTCFullYear();
    const m = anchor.getUTCMonth();
    switch (period) {
      case 'daily': start = anchor; end = addDays(anchor, 1); break;
      case 'weekly': { // semana ISO: lunes a domingo
        const dow = (anchor.getUTCDay() + 6) % 7;
        start = addDays(anchor, -dow); end = addDays(start, 7); break;
      }
      case 'monthly': start = new Date(Date.UTC(y, m, 1)); end = addMonths(start, 1); break;
      case 'quarterly': start = new Date(Date.UTC(y, Math.floor(m / 3) * 3, 1)); end = addMonths(start, 3); break;
      case 'semiannual': start = new Date(Date.UTC(y, m < 6 ? 0 : 6, 1)); end = addMonths(start, 6); break;
      case 'annual': start = new Date(Date.UTC(y, 0, 1)); end = new Date(Date.UTC(y + 1, 0, 1)); break;
      default: break;
    }
  }
  const days = Math.round((end - start) / 86400000);
  // Periodo anterior equivalente (mismo tipo de calendario) y mismo periodo del año anterior
  let prevStart;
  let prevEnd;
  if (['monthly', 'quarterly', 'semiannual', 'annual'].includes(period)) {
    const months = { monthly: 1, quarterly: 3, semiannual: 6, annual: 12 }[period];
    prevStart = addMonths(start, -months); prevEnd = start;
  } else {
    prevStart = addDays(start, -days); prevEnd = start;
  }
  const yoyStart = new Date(Date.UTC(start.getUTCFullYear() - 1, start.getUTCMonth(), start.getUTCDate()));
  const yoyEnd = new Date(Date.UTC(end.getUTCFullYear() - 1, end.getUTCMonth(), end.getUTCDate()));
  // Periodo en curso: comparar contra la misma cantidad de días transcurridos
  // (p. ej. 1–20 de octubre vs 1–20 de septiembre), no contra el periodo anterior completo.
  const today = parseDate(todayIn(timezone));
  const inProgress = today >= start && today < end;
  let toDate = null;
  if (inProgress) {
    const elapsed = Math.round((today - start) / 86400000) + 1;
    const prevLen = Math.round((prevEnd - prevStart) / 86400000);
    const yoyLen = Math.round((yoyEnd - yoyStart) / 86400000);
    toDate = {
      elapsedDays: elapsed,
      previous: { from: fmt(prevStart), to: fmt(addDays(prevStart, Math.min(elapsed, prevLen))) },
      previousYear: { from: fmt(yoyStart), to: fmt(addDays(yoyStart, Math.min(elapsed, yoyLen))) },
    };
  }
  return {
    period,
    timezone,
    inProgress,
    toDate,
    from: fmt(start),
    to: fmt(end),
    lastDay: fmt(addDays(end, -1)),
    days,
    previous: { from: fmt(prevStart), to: fmt(prevEnd) },
    previousYear: { from: fmt(yoyStart), to: fmt(yoyEnd) },
  };
}

module.exports = { resolve, todayIn, PERIODS, parseDate, fmt, addDays };
