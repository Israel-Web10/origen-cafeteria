const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const env = require('./config/env');
const { pool } = require('./config/db');
const logger = require('./utils/logger');
const limits = require('./middleware/rateLimits');
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
    if (req.path === '/api/health') return;
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

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'ok', uptime_s: Math.round(process.uptime()) });
  } catch {
    res.status(503).json({ status: 'degraded', db: 'unreachable' });
  }
});

app.use('/api', limits.general);
app.use('/api/auth', authRoutes);
app.use('/api/categories', catalog.categories);
app.use('/api/products', catalog.products);
app.use('/api/promotions', catalog.promotions);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/settings', settingsRoutes.settings);
app.use('/api/currencies', settingsRoutes.currencies);
app.use('/api/uploads', contentRoutes.images);
app.use('/api/pages', contentRoutes.pages);
app.use('/api/consent', contentRoutes.consent);
app.use('/api/users', userRoutes.users);
app.use('/api/audit', userRoutes.audit);
app.use('/api/inventory', backoffice.inventory);
app.use('/api/analytics', backoffice.analytics);
app.use('/api/reports', backoffice.reports);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
