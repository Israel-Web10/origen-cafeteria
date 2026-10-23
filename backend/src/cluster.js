// Arranque multiproceso: un proceso de Node usa un solo núcleo. Con
// WEB_CONCURRENCY=N se lanzan N procesos que comparten el puerto (módulo
// cluster de Node, sin dependencias). Si un proceso muere, se reemplaza.
// Regla de capacidad: N × DB_POOL_MAX debe quedar por debajo de
// max_connections de PostgreSQL (100 por defecto), dejando margen para backups.
require('dotenv').config();
const cluster = require('node:cluster');
const env = require('./config/env');
const logger = require('./utils/logger');

const workers = env.WEB_CONCURRENCY;

if (cluster.isPrimary && workers > 1) {
  logger.info('cluster.started', { workers, db_connections_max: workers * env.DB_POOL_MAX });
  let stopping = false;
  const recent = [];
  for (let i = 0; i < workers; i++) cluster.fork();
  cluster.on('exit', (worker, code, signal) => {
    if (stopping) return;
    logger.error('cluster.worker_exit', { pid: worker.process.pid, code, signal });
    // Evita un bucle de reinicios si el fallo es permanente (p. ej. configuración inválida)
    const now = Date.now();
    recent.push(now);
    while (recent.length && now - recent[0] > 60_000) recent.shift();
    if (recent.length > workers * 3) {
      logger.error('cluster.too_many_restarts', {});
      process.exit(1);
    }
    cluster.fork();
  });
  const stop = (signal) => {
    stopping = true;
    for (const w of Object.values(cluster.workers)) w.process.kill(signal);
    setTimeout(() => process.exit(0), 11_000).unref();
  };
  process.on('SIGTERM', () => stop('SIGTERM'));
  process.on('SIGINT', () => stop('SIGINT'));
} else {
  require('./server');
}
