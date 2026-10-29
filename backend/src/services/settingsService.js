// Configuración del negocio editable desde el panel. Solo se aceptan claves
// declaradas aquí, cada una con su validación: el gerente no puede inyectar
// claves arbitrarias ni valores mal formados.
const { z } = require('zod');
const { query, pool } = require('../config/db');
const { badRequest } = require('../utils/errors');

const url = z.string().trim().max(500).refine(
  (v) => v === '' || /^https:\/\/[^\s"'<>]+$/.test(v) || /^\/uploads\/public\/[\w./-]+$/.test(v) || /^\/media\/(?:[\w-]+\/)*[\w-]+\.[a-z0-9]+$/i.test(v),
  'Debe ser una URL https:// o un archivo subido'
);
const text = (max) => z.string().trim().max(max);
const bool = z.enum(['true', 'false']);
const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const hoursSchema = z.object(
  Object.fromEntries(DAYS.map((d) => [d, z.array(z.tuple([hhmm, hhmm])).max(3)]))
);

const PALETTES = ['espresso', 'cacao', 'olivo', 'noche'];

const DEFINITIONS = {
  business_name: text(80).min(1),
  legal_name: text(150),
  tax_id: text(40),
  slogan: text(160),
  logo_url: url,
  favicon_url: url,
  hero_video_url: url,
  facade_image_url: url,
  street_scene_enabled: bool,
  hero_poster_url: url,
  hero_is_illustrative: bool,
  story_video_url: url,
  story_poster_url: url,
  brand_palette: z.enum(PALETTES),
  address: text(255),
  city: text(80),
  latitude: z.string().trim().regex(/^-?\d{1,2}(\.\d{1,7})?$|^$/),
  longitude: z.string().trim().regex(/^-?\d{1,3}(\.\d{1,7})?$|^$/),
  gmaps_link: url,
  phone: text(30),
  whatsapp: text(30),
  email: z.string().trim().max(150).refine((v) => v === '' || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v), 'Correo inválido'),
  social_facebook: url,
  social_instagram: url,
  social_tiktok: url,
  opening_hours: z.string().refine((v) => {
    try { return hoursSchema.safeParse(JSON.parse(v)).success; } catch { return false; }
  }, 'Formato de horarios inválido'),
  timezone: z.string().refine((tz) => {
    try { new Intl.DateTimeFormat('en', { timeZone: tz }); return true; } catch { return false; }
  }, 'Zona horaria inválida'),
  pickup_enabled: bool,
  delivery_enabled: bool,
  delivery_min_order_cents: z.string().regex(/^\d{1,9}$/),
  prices_include_tax: bool,
  currency_display_enabled: bool,
  display_rounding: z.enum(['none', '0.05', '0.10', '0.50', '1']),
  policy_version: text(20).min(1),
  data_retention_months: z.string().regex(/^\d{1,3}$/),
  low_stock_alerts_enabled: bool,
  // Textos comerciales editables por idioma
  ...Object.fromEntries(
    ['es', 'en', 'fr'].flatMap((l) => [
      [`hero_title_${l}`, text(160)],
      [`hero_subtitle_${l}`, text(400)],
      [`announcement_${l}`, text(200)],
    ])
  ),
};

const DEFAULTS = {
  business_name: 'ORIGEN',
  legal_name: '',
  tax_id: '',
  slogan: 'Café artesanal, de origen a taza',
  logo_url: '',
  favicon_url: '',
  hero_video_url: '/media/cafe-interior-720.mp4',
  // Fachada: vacío = ilustración original de la marca; con foto real del local, se muestra la foto
  facade_image_url: '',
  street_scene_enabled: 'true',
  hero_poster_url: '/media/cafe-interior-poster.webp',
  hero_is_illustrative: 'true',
  story_video_url: '/media/cafe-fireplace-720.mp4',
  story_poster_url: '/media/cafe-fireplace-poster.webp',
  brand_palette: 'espresso',
  address: '',
  city: 'La Paz, Bolivia',
  latitude: '',
  longitude: '',
  gmaps_link: '',
  phone: '',
  whatsapp: '',
  email: '',
  social_facebook: '',
  social_instagram: '',
  social_tiktok: '',
  opening_hours: JSON.stringify({
    mon: [['07:00', '20:00']], tue: [['07:00', '20:00']], wed: [['07:00', '20:00']],
    thu: [['07:00', '20:00']], fri: [['07:00', '20:00']], sat: [['08:00', '20:00']], sun: [['08:00', '14:00']],
  }),
  timezone: 'America/La_Paz',
  pickup_enabled: 'true',
  delivery_enabled: 'false',
  delivery_min_order_cents: '0',
  prices_include_tax: 'true',
  currency_display_enabled: 'false',
  display_rounding: 'none',
  policy_version: '2026-10',
  data_retention_months: '24',
  low_stock_alerts_enabled: 'true',
  hero_title_es: 'Entra. El café ya está listo.',
  hero_subtitle_es: 'Tostado en pequeños lotes, chocolate y cacao boliviano. Pide en línea y recoge sin esperar.',
  hero_title_en: 'Step inside. Your coffee is ready.',
  hero_subtitle_en: 'Small-batch roasts, Bolivian chocolate and cacao. Order online and pick up without waiting.',
  hero_title_fr: 'Entrez. Votre café est prêt.',
  hero_subtitle_fr: 'Torréfaction en petits lots, chocolat et cacao boliviens. Commandez en ligne, sans attendre.',
  announcement_es: '',
  announcement_en: '',
  announcement_fr: '',
};

let cache = null;
let cacheAt = 0;
const TTL_MS = 30_000;

async function getAll({ fresh = false } = {}) {
  if (!fresh && cache && Date.now() - cacheAt < TTL_MS) return cache;
  const rows = await query('SELECT key, value FROM settings');
  const result = { ...DEFAULTS };
  for (const r of rows) if (r.key in DEFINITIONS) result[r.key] = r.value ?? '';
  cache = result;
  cacheAt = Date.now();
  return result;
}

async function get(key) {
  return (await getAll())[key];
}

function invalidate() {
  cache = null;
}

/** Valida y guarda varias claves. Devuelve { before, after } con solo lo que cambió. */
async function setMany(entries, userId, client = pool) {
  const errors = [];
  const clean = {};
  for (const [key, raw] of Object.entries(entries || {})) {
    const def = DEFINITIONS[key];
    if (!def) { errors.push({ field: key, message: 'Clave de configuración desconocida' }); continue; }
    const parsed = def.safeParse(raw == null ? '' : String(raw));
    if (!parsed.success) errors.push({ field: key, message: parsed.error.issues[0].message });
    else clean[key] = parsed.data;
  }
  if (errors.length) throw badRequest('validation_error', `${errors[0].field}: ${errors[0].message}`, { fields: errors });

  const current = await getAll({ fresh: true });
  const before = {};
  const after = {};
  for (const [key, value] of Object.entries(clean)) {
    if (current[key] === value) continue;
    before[key] = current[key];
    after[key] = value;
    await client.query(
      `INSERT INTO settings (key, value, updated_by, updated_at) VALUES ($1, $2, $3, now())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = now()`,
      [key, value, userId ?? null]
    );
  }
  invalidate();
  return { before, after };
}

module.exports = { getAll, get, setMany, invalidate, DEFAULTS, DEFINITIONS, PALETTES };
