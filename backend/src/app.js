const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const env = require('./config/env');
const { pool } = require('./config/db');
const logger = require('./utils/logger');
const limits = require('./middleware/rateLimits');
const cache = require('./middleware/microCache');
const { isStaff } = require('./middleware/auth');
const { version } = require('../package.json');
const { DIRS, driverName } = require('./services/storageService');
const { errorHandler, notFound } = require('./middleware/errorHandler');

const authRoutes = require('./routes/authRoutes');
const catalog = require('./routes/catalogRoutes');
const orderRoutes = require('./routes/orderRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const userRoutes = require('./routes/userRoutes');
const contentRoutes = require('./routes/contentRoutes');
const backoffice = require('./routes/backofficeRoutes');

const app = express();
app.disable('x-powered-by');
if (env.TRUST_PROXY) app.set('trust proxy', env.TRUST_PROXY);

// API JSON pura: CSP restrictiva. Las imágenes públicas se sirven con
// Cross-Origin-Resource-Policy cross-origin para que el frontend (otro origen) pueda mostrarlas.
app.use(helmet({
  contentSecurityPolicy: { directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } },
  crossOriginResourcePolicy: { policy: 'same-site' },
  hsts: env.NODE_ENV === 'production' ? { maxAge: 31536000, includeSubDomains: true } : false,
}));
app.use(cors({
  origin(origin, cb) {
    // Peticiones sin Origin (curl, health checks, mismo origen) se permiten; los navegadores siempre lo envían.
    if (!origin || env.corsOrigins.includes(origin)) return cb(null, true);
    return cb(null, false);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key'],
  maxAge: 600,
}));
app.use(compression());
app.use(express.json({ limit: '200kb' }));

// Registro de peticiones SIN query string (puede contener tokens de seguimiento)
app.use((req, res, next) => {
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    if (req.path.endsWith('/health')) return;
    logger.info('http', { method: req.method, path: req.path, status: res.statusCode, ms: Math.round(ms) });
  });
  next();
});

// Archivos públicos subidos (nunca los privados). Con STORAGE_DRIVER=s3 se sirven desde el bucket.
if (driverName === 'local') app.use('/uploads/public', express.static(DIRS.public, {
  maxAge: '30d',
  immutable: true,
  index: false,
  dotfiles: 'deny',
  setHeaders(res) {
    res.set({
      'Cross-Origin-Resource-Policy': 'cross-origin',
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox",
      'X-Content-Type-Options': 'nosniff',
    });
  },
}));

// ---------- API versionada ----------
// La misma API se publica en /api/v1 (estable) y en /api (alias de la versión
// actual, para no romper clientes existentes). Un cambio incompatible futuro iría
// en /api/v2 manteniendo /api/v1 durante la transición (ver CHANGELOG.md).
const API_VERSION = 'v1';
const api = express.Router();
api.use((req, res, next) => { res.set('API-Version', API_VERSION); next(); });

api.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'ok', uptime_s: Math.round(process.uptime()) });
  } catch {
    res.status(503).json({ status: 'degraded', db: 'unreachable' });
  }
});
api.get('/version', (req, res) => res.json({ api: API_VERSION, version }));

api.use(limits.general);
// Cualquier cambio hecho por el personal (productos, precios, configuración...)
// vacía la micro-caché para que la carta pública se actualice al instante.
api.use((req, res, next) => {
  if (req.method !== 'GET') res.on('finish', () => { if (res.statusCode < 400 && isStaff(req.user)) cache.clear(); });
  next();
});
api.use(['/categories', '/products', '/promotions', '/settings', '/pages', '/uploads'], cache.microCache(env.PUBLIC_CACHE_TTL_MS));

api.use('/auth', authRoutes);
api.use('/categories', catalog.categories);
api.use('/products', catalog.products);
api.use('/promotions', catalog.promotions);
api.use('/orders', orderRoutes);
api.use('/payments', paymentRoutes);
api.use('/settings', settingsRoutes.settings);
api.use('/currencies', settingsRoutes.currencies);
api.use('/uploads', contentRoutes.images);
api.use('/pages', contentRoutes.pages);
api.use('/consent', contentRoutes.consent);
api.use('/users', userRoutes.users);
api.use('/audit', userRoutes.audit);
api.use('/inventory', backoffice.inventory);
api.use('/analytics', backoffice.analytics);
api.use('/reports', backoffice.reports);
// 404 dentro del router: /api/v1/ruta-inexistente no vuelve a pasar por el alias /api
api.use(notFound);

app.use(`/api/${API_VERSION}`, api);
app.use('/api', api);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
