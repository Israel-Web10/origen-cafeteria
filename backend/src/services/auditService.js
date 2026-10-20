const { pool, query } = require('../config/db');

// Campos que nunca deben quedar en la auditoría.
const SENSITIVE = new Set(['password', 'password_hash', 'token', 'public_token', 'proof_storage_key']);

function scrub(obj) {
  if (!obj || typeof obj !== 'object') return obj ?? null;
  const out = {};
  for (const [k, v] of Object.entries(obj)) if (!SENSITIVE.has(k)) out[k] = v;
  return out;
}

/**
 * Registra una operación crítica. Acepta un `client` de transacción para que
 * el registro se confirme o se descarte junto con la operación.
 */
async function record({ req, userId, action, entity, entityId, before, after }, client = pool) {
  await client.query(
    `INSERT INTO audit_log (user_id, action, entity, entity_id, before, after, ip)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      userId ?? req?.user?.id ?? null,
      action,
      entity,
      entityId != null ? String(entityId) : null,
      before ? JSON.stringify(scrub(before)) : null,
      after ? JSON.stringify(scrub(after)) : null,
      req?.ip ? String(req.ip).slice(0, 64) : null,
    ]
  );
}

async function list({ entity, userId, from, to, limit = 100, offset = 0 }) {
  return query(
    `SELECT a.*, u.name AS user_name, u.email AS user_email
       FROM audit_log a LEFT JOIN users u ON u.id = a.user_id
      WHERE ($1::text IS NULL OR a.entity = $1)
        AND ($2::int IS NULL OR a.user_id = $2)
        AND ($3::timestamptz IS NULL OR a.created_at >= $3)
        AND ($4::timestamptz IS NULL OR a.created_at < $4)
      ORDER BY a.created_at DESC
      LIMIT $5 OFFSET $6`,
    [entity ?? null, userId ?? null, from ?? null, to ?? null, limit, offset]
  );
}

module.exports = { record, list };
