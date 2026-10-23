// Configuración validada al arrancar. Si falta algo obligatorio el proceso
// se detiene con un mensaje claro en vez de fallar a mitad de una petición.
const path = require('path');
const { z } = require('zod');

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  // Lista separada por comas de orígenes permitidos (CORS). Obligatoria en producción.
  CLIENT_URL: z.string().default('http://localhost:5173'),
  // Si la API está detrás de un proxy (Nginx, Render, Railway...) indica cuántos saltos confiar.
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),

  DATABASE_URL: z.string().optional(),
  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.coerce.number().int().positive().default(5432),
  DB_USER: z.string().default('origen_app'),
  DB_PASSWORD: z.string().default(''),
  DB_NAME: z.string().default('origen_cafeteria'),
  DB_SSL: z.enum(['disable', 'require', 'verify-full']).default('disable'),
  DB_POOL_MAX: z.coerce.number().int().positive().default(10),
  DB_STATEMENT_TIMEOUT_MS: z.coerce.number().int().positive().default(15000),

  JWT_SECRET: z.string().min(32, 'JWT_SECRET debe tener al menos 32 caracteres aleatorios.'),
  JWT_EXPIRES_IN: z.string().default('12h'),

  UPLOAD_DIR: z.string().default('uploads'),
  MAX_UPLOAD_SIZE_MB: z.coerce.number().positive().max(20).default(5),
  PUBLIC_API_URL: z.string().optional(),

  // Escalabilidad: micro-caché de lecturas públicas (0 = desactivada) y límite general por IP.
  // En pruebas la caché se desactiva por defecto para que cada lectura vea el estado recién escrito.
  PUBLIC_CACHE_TTL_MS: z.coerce.number().int().min(0).max(300000).default(process.env.NODE_ENV === 'test' ? 0 : 10000),
  RATE_LIMIT_GENERAL_PER_MIN: z.coerce.number().int().positive().default(300),
  // Procesos de Node (src/cluster.js). Cada uno abre hasta DB_POOL_MAX conexiones a PostgreSQL.
  WEB_CONCURRENCY: z.coerce.number().int().min(1).max(32).default(1),

  REPORT_MAX_ROWS: z.coerce.number().int().positive().default(50000),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  // Pagos con tarjeta: solo el proveedor de PRUEBAS está implementado.
  CARD_PROVIDER: z.enum(['none', 'test']).default('none'),
});

function load() {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    console.error(`[config] Variables de entorno inválidas:\n${issues}\nRevisa backend/.env (usa .env.example como guía).`);
    process.exit(1);
  }
  const env = parsed.data;
  if (env.NODE_ENV === 'production') {
    if (env.CLIENT_URL.includes('localhost')) {
      console.error('[config] En producción CLIENT_URL debe ser el dominio real (https://...).');
      process.exit(1);
    }
    if (env.CARD_PROVIDER === 'test') {
      console.error('[config] CARD_PROVIDER=test no está permitido en producción.');
      process.exit(1);
    }
  }
  env.corsOrigins = env.CLIENT_URL.split(',').map((s) => s.trim()).filter(Boolean);
  env.uploadRoot = path.resolve(process.cwd(), env.UPLOAD_DIR);
  return env;
}

module.exports = load();
