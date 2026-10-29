// Monedas y tipos de cambio ADMINISTRADOS MANUALMENTE por el gerente.
// La conversión solo sirve para MOSTRAR precios aproximados: los precios
// oficiales, los pedidos y los cobros están siempre en la moneda base.
const { query, one, pool } = require('../config/db');
const { badRequest, notFound } = require('../utils/errors');

async function listCurrencies() {
  return query('SELECT * FROM currencies ORDER BY is_base DESC, code');
}

async function baseCurrency(client = pool) {
  const base = await one('SELECT * FROM currencies WHERE is_base', [], client);
  if (!base) throw new Error('No hay moneda base configurada. Ejecuta npm run setup.');
  return base;
}

async function updateCurrency(code, { enabled, name, symbol }) {
  const cur = await one('SELECT * FROM currencies WHERE code = $1', [code]);
  if (!cur) throw notFound('currency_not_found', 'Moneda no encontrada.');
  if (cur.is_base && enabled === false) throw badRequest('base_currency', 'No se puede deshabilitar la moneda base.');
  return one(
    `UPDATE currencies SET enabled = COALESCE($2, enabled), name = COALESCE($3, name), symbol = COALESCE($4, symbol)
      WHERE code = $1 RETURNING *`,
    [code, enabled ?? null, name ?? null, symbol ?? null]
  );
}

/**
 * Cambia la moneda base. Solo se permite si no existen pedidos ni productos,
 * porque los importes históricos están expresados en la base anterior.
 */
async function setBaseCurrency(code, client) {
  const { count: orders } = await one('SELECT COUNT(*)::int AS count FROM orders', [], client);
  const { count: products } = await one('SELECT COUNT(*)::int AS count FROM products', [], client);
  if (orders > 0 || products > 0) {
    throw badRequest('base_currency_locked', 'La moneda base no puede cambiarse cuando ya existen productos o pedidos.');
  }
  await client.query('UPDATE currencies SET is_base = FALSE WHERE is_base');
  await client.query('UPDATE currencies SET is_base = TRUE, enabled = TRUE WHERE code = $1', [code]);
}

async function addRate({ quote_code, rate, rate_type, source, notes, effective_at }, userId) {
  const base = await baseCurrency();
  if (quote_code === base.code) throw badRequest('same_currency', 'La moneda destino debe ser distinta de la base.');
  const quote = await one('SELECT * FROM currencies WHERE code = $1', [quote_code]);
  if (!quote) throw notFound('currency_not_found', 'Moneda no encontrada.');
  return one(
    `INSERT INTO exchange_rates (base_code, quote_code, rate, rate_type, source, notes, effective_at, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, now()), $8) RETURNING *`,
    [base.code, quote_code, rate, rate_type, source, notes || null, effective_at || null, userId]
  );
}

/** Último tipo de cambio vigente por moneda habilitada (para mostrar precios). */
async function currentRates() {
  return query(
    `SELECT DISTINCT ON (r.quote_code) r.id, r.base_code, r.quote_code, r.rate::text AS rate, r.rate_type,
            r.source, r.effective_at, c.symbol, c.decimals, c.name
       FROM exchange_rates r JOIN currencies c ON c.code = r.quote_code
      WHERE c.enabled AND r.effective_at <= now()
        AND r.base_code = (SELECT code FROM currencies WHERE is_base)
      ORDER BY r.quote_code, r.effective_at DESC, r.id DESC`
  );
}

async function rateHistory(quoteCode, limit = 50) {
  return query(
    `SELECT r.*, r.rate::text AS rate, u.name AS created_by_name
       FROM exchange_rates r LEFT JOIN users u ON u.id = r.created_by
      WHERE ($1::text IS NULL OR r.quote_code = $1)
      ORDER BY r.effective_at DESC, r.id DESC LIMIT $2`,
    [quoteCode || null, limit]
  );
}

module.exports = { listCurrencies, baseCurrency, updateCurrency, setBaseCurrency, addRate, currentRates, rateHistory };
