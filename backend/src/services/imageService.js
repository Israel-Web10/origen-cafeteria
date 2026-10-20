const { query, one, withTransaction } = require('../config/db');
const storage = require('./storageService');
const audit = require('./auditService');
const { notFound } = require('../utils/errors');

async function list({ entityType, entityId } = {}) {
  return query(
    `SELECT id, entity_type, entity_id, url, alt_text, is_primary, is_illustrative, source, license, display_order, width, height, created_at
       FROM images
      WHERE ($1::text IS NULL OR entity_type = $1) AND ($2::int IS NULL OR entity_id = $2)
      ORDER BY display_order, id DESC`,
    [entityType ?? null, entityId ?? null]
  );
}

async function upload(file, meta, req) {
  const saved = await storage.saveImage(file, 'public');
  try {
    return await withTransaction(async (client) => {
      if (meta.is_primary && meta.entity_id) {
        await client.query('UPDATE images SET is_primary = FALSE WHERE entity_type = $1 AND entity_id = $2', [meta.entity_type, meta.entity_id]);
      }
      const image = await one(
        `INSERT INTO images (entity_type, entity_id, url, storage_key, alt_text, is_primary, is_illustrative, source, license, display_order, width, height, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
        [meta.entity_type, meta.entity_id ?? null, saved.url, saved.key, meta.alt_text ?? null, meta.is_primary ?? false,
          meta.is_illustrative ?? false, meta.source ?? null, meta.license ?? null, meta.display_order ?? 0, saved.width, saved.height, req.user.id],
        client
      );
      // La imagen principal de un producto se refleja en products.image_url
      if (meta.entity_type === 'product' && meta.entity_id && meta.is_primary) {
        await client.query('UPDATE products SET image_url = $2 WHERE id = $1', [meta.entity_id, saved.url]);
      }
      await audit.record({ req, action: 'image.upload', entity: 'image', entityId: image.id, after: { entity_type: image.entity_type, url: image.url } }, client);
      return image;
    });
  } catch (e) {
    await storage.remove('public', saved.key);
    throw e;
  }
}

async function update(id, data, req) {
  const before = await one('SELECT * FROM images WHERE id = $1', [id]);
  if (!before) throw notFound('image_not_found', 'Imagen no encontrada.');
  const after = await one(
    `UPDATE images SET alt_text = COALESCE($2, alt_text), display_order = COALESCE($3, display_order),
            is_illustrative = COALESCE($4, is_illustrative), source = COALESCE($5, source), license = COALESCE($6, license)
      WHERE id = $1 RETURNING *`,
    [id, data.alt_text ?? null, data.display_order ?? null, data.is_illustrative ?? null, data.source ?? null, data.license ?? null]
  );
  await audit.record({ req, action: 'image.update', entity: 'image', entityId: id, before, after });
  return after;
}

async function remove(id, req) {
  const image = await one('SELECT * FROM images WHERE id = $1', [id]);
  if (!image) throw notFound('image_not_found', 'Imagen no encontrada.');
  await query('DELETE FROM images WHERE id = $1', [id]);
  if (image.entity_type === 'product' && image.entity_id) {
    await query('UPDATE products SET image_url = NULL WHERE id = $1 AND image_url = $2', [image.entity_id, image.url]);
  }
  // Solo se borra el archivo si ninguna configuración sigue apuntando a él
  const inUse = await one('SELECT 1 FROM settings WHERE value = $1 UNION ALL SELECT 1 FROM products WHERE image_url = $1 LIMIT 1', [image.url]);
  if (!inUse && image.storage_key) await storage.remove('public', image.storage_key);
  await audit.record({ req, action: 'image.delete', entity: 'image', entityId: id, before: image });
}

module.exports = { list, upload, update, remove };
