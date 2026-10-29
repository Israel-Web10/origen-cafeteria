const { Pool, types } = require('pg');
const env = require('./env');
const logger = require('../utils/logger');

// BIGINT (COUNT, SUM de enteros) llega como string por defecto. Los importes
// están en centavos enteros y caben con holgura en Number.MAX_SAFE_INTEGER,
// así que los convertimos a número. NUMERIC (cantidades de inventario,
// tipos de cambio) se deja como string y se convierte explícitamente donde se usa.
types.setTypeParser(20, (v) => (v === null ? null : Number(v)));

function buildConfig() {
  const ssl =
    env.DB_SSL === 'disable' ? false : { rejectUnauthorized: env.DB_SSL === 'verify-full' };
  const base = env.DATABASE_URL
    ? { connectionString: env.DATABASE_URL }
    : {
        host: env.DB_HOST,
        port: env.DB_PORT,
        user: env.DB_USER,
        password: env.DB_PASSWORD,
        database: env.DB_NAME,
      };
  return {
    ...base,
    ssl,
    max: env.DB_POOL_MAX,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    statement_timeout: env.DB_STATEMENT_TIMEOUT_MS,
    application_name: 'origen-api',
  };
}

const pool = new Pool(buildConfig());
pool.on('error', (err) => logger.error('db.pool_error', { message: err.message }));

/** Ejecuta una consulta parametrizada ($1, $2...) y devuelve las filas. */
async function query(text, params = [], client = pool) {
  const res = await client.query(text, params);
  return res.rows;
}

async function one(text, params = [], client = pool) {
  const rows = await query(text, params, client);
  return rows[0] || null;
}

/**
 * Ejecuta `fn(client)` dentro de una transacción. Hace COMMIT si termina bien
 * y ROLLBACK ante cualquier error (que se vuelve a lanzar).
 */
async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

async function checkConnection() {
  try {
    await pool.query('SELECT 1');
    logger.info('db.connected');
    return true;
  } catch (err) {
    logger.error('db.connection_failed', { message: err.message });
    return false;
  }
}

module.exports = { pool, query, one, withTransaction, checkConnection, buildConfig };
