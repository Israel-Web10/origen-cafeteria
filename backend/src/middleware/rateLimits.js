const rateLimit = require('express-rate-limit');

// Límites en memoria por IP. Con varias instancias de la API detrás de un
// balanceador, cada instancia cuenta por separado (aceptable a esta escala;
// para un límite global se necesitaría un almacén compartido).
const make = (windowMs, limit, code, message) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skip: () => process.env.NODE_ENV === 'test' && !process.env.TEST_RATE_LIMITS,
    message: { error: message, code },
  });

module.exports = {
  general: make(60_000, 300, 'rate_limited', 'Demasiadas solicitudes. Espera un momento.'),
  auth: make(15 * 60_000, 20, 'rate_limited_auth', 'Demasiados intentos. Espera unos minutos.'),
  orders: make(10 * 60_000, 20, 'rate_limited_orders', 'Demasiados pedidos en poco tiempo. Espera unos minutos.'),
  tracking: make(10 * 60_000, 60, 'rate_limited_tracking', 'Demasiadas consultas de seguimiento. Espera unos minutos.'),
  uploads: make(10 * 60_000, 30, 'rate_limited_uploads', 'Demasiadas subidas de archivos. Espera unos minutos.'),
  reports: make(60_000, 10, 'rate_limited_reports', 'Demasiados reportes seguidos. Espera un minuto.'),
};
