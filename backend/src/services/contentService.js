// Páginas editables (historia, instalaciones, FAQ, políticas legales) por idioma.
// Flujo: el gerente guarda un BORRADOR → lo previsualiza → lo PUBLICA.
// El contenido es Markdown limitado; el frontend lo renderiza sin HTML crudo.
const { query, one, withTransaction } = require('../config/db');
const { notFound, badRequest } = require('../utils/errors');
const audit = require('./auditService');

const SLUGS = ['history', 'facilities', 'faq', 'privacy', 'cookies', 'terms', 'refunds', 'order-conditions'];
const LOCALES = ['es', 'en', 'fr'];

async function getPublished(slug, locale) {
  const row = await one(
    `SELECT slug, locale, title, body, version, updated_at FROM pages
      WHERE slug = $1 AND published AND locale = ANY($2::text[])
      ORDER BY array_position($2::text[], locale) LIMIT 1`,
    [slug, [locale, 'es'].filter((v, i, a) => a.indexOf(v) === i)]
  );
  if (!row) throw notFound('page_not_found', 'Página no encontrada.');
  return { ...row, fallback: row.locale !== locale };
}

async function listAll() {
  return query(
    `SELECT p.slug, p.locale, p.title, p.published, p.version, p.updated_at, (p.draft_body IS NOT NULL) AS has_draft, u.name AS updated_by_name
       FROM pages p LEFT JOIN users u ON u.id = p.updated_by ORDER BY p.slug, p.locale`
  );
}

async function getForEdit(slug, locale) {
  const row = await one('SELECT * FROM pages WHERE slug = $1 AND locale = $2', [slug, locale]);
  return row || { slug, locale, title: '', body: '', draft_title: null, draft_body: null, published: false, version: 0 };
}

async function saveDraft(slug, locale, { title, body }, req) {
  if (!SLUGS.includes(slug) || !LOCALES.includes(locale)) throw badRequest('page_invalid', 'Página o idioma inválido.');
  return one(
    `INSERT INTO pages (slug, locale, title, body, draft_title, draft_body, published, version, updated_by)
     VALUES ($1, $2, $3, '', $3, $4, FALSE, 0, $5)
     ON CONFLICT (slug, locale) DO UPDATE SET draft_title = EXCLUDED.draft_title, draft_body = EXCLUDED.draft_body,
       updated_by = EXCLUDED.updated_by, updated_at = now()
     RETURNING *`,
    [slug, locale, title, body, req.user.id]
  );
}

async function publish(slug, locale, req) {
  return withTransaction(async (client) => {
    const before = await one('SELECT * FROM pages WHERE slug = $1 AND locale = $2 FOR UPDATE', [slug, locale], client);
    if (!before || before.draft_body == null) throw badRequest('no_draft', 'No hay borrador para publicar.');
    const after = await one(
      `UPDATE pages SET title = draft_title, body = draft_body, draft_title = NULL, draft_body = NULL, published = TRUE,
              version = version + 1, updated_by = $3, updated_at = now()
        WHERE slug = $1 AND locale = $2 RETURNING *`,
      [slug, locale, req.user.id],
      client
    );
    await audit.record({ req, action: 'page.publish', entity: 'page', entityId: `${slug}:${locale}`,
      before: { title: before.title, version: before.version, body: before.body }, after: { title: after.title, version: after.version } }, client);
    return after;
  });
}

async function discardDraft(slug, locale) {
  await query('UPDATE pages SET draft_title = NULL, draft_body = NULL WHERE slug = $1 AND locale = $2', [slug, locale]);
}

// ---------- Consentimiento de cookies ----------

async function recordConsent({ consent_id, analytics, marketing, policy_version }, userAgent) {
  await query(
    `INSERT INTO cookie_consents (consent_id, necessary, analytics, marketing, policy_version, user_agent)
     VALUES ($1, TRUE, $2, $3, $4, $5)`,
    [consent_id, analytics, marketing, policy_version, (userAgent || '').slice(0, 300)]
  );
}

module.exports = { SLUGS, LOCALES, getPublished, listAll, getForEdit, saveDraft, publish, discardDraft, recordConsent };
