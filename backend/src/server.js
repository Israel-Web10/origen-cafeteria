require('dotenv').config();
const env = require('./config/env');
const app = require('./app');
const { pool, checkConnection } = require('./config/db');
const logger = require('./utils/logger');

const server = app.listen(env.PORT, async () => {
  logger.info('server.started', { port: env.PORT, env: env.NODE_ENV, card_provider: env.CARD_PROVIDER });
  await checkConnection();
});

// Tiempos de espera para no acumular conexiones colgadas
server.headersTimeout = 20_000;
server.requestTimeout = 60_000;
server.keepAliveTimeout = 5_000;

// Apagado ordenado: deja de aceptar conexiones, termina las activas y cierra el pool.
function shutdown(signal) {
  logger.info('server.stopping', { signal });
  server.close(async () => {
    await pool.end().catch(() => {});
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (err) => logger.error('unhandled_rejection', { message: err?.message }));
