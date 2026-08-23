const mysql = require('mysql2/promise');

// MySQL/mysql2 devuelve las columnas TINYINT(1) (usadas para BOOLEAN en el
// schema: active, available, is_primary, etc.) como números 0/1 por
// defecto, no como booleanos de JS. Como el frontend en TypeScript espera
// `boolean` real (ver src/types/index.ts), convertimos explícitamente
// cualquier TINYINT(1) a true/false aquí, en un solo lugar.
function typeCast(field, next) {
  if (field.type === 'TINY' && field.length === 1) {
    const value = field.string();
    return value === null ? null : value === '1';
  }
  return next();
}

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'origen_cafeteria',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  decimalNumbers: true, // devuelve DECIMAL como number en vez de string
  typeCast,
});

// Verificación rápida de conexión al arrancar (no bloquea el arranque).
async function checkConnection() {
  try {
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
    console.log('[db] Conexión a MySQL establecida correctamente.');
  } catch (err) {
    console.error('[db] No se pudo conectar a MySQL:', err.message);
    console.error('[db] Verifica las variables DB_* en tu archivo .env');
  }
}

module.exports = { pool, checkConnection };
