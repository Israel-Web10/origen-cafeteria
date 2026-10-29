function slugify(text) {
  return String(text)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100) || 'item';
}

/** Genera un slug único consultando la tabla indicada (solo nombres internos fijos). */
async function uniqueSlug(client, table, text, excludeId = null) {
  if (!['categories', 'products'].includes(table)) throw new Error('tabla no permitida');
  const base = slugify(text);
  let candidate = base;
  for (let i = 2; i < 200; i++) {
    const { rows } = await client.query(
      `SELECT 1 FROM ${table} WHERE slug = $1 AND ($2::int IS NULL OR id <> $2) LIMIT 1`,
      [candidate, excludeId]
    );
    if (rows.length === 0) return candidate;
    candidate = `${base}-${i}`;
  }
  return `${base}-${Date.now()}`;
}

module.exports = { slugify, uniqueSlug };
