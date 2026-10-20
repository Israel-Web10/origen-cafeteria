const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { query, one, withTransaction } = require('../config/db');
const { signToken } = require('../middleware/auth');
const { badRequest, notFound, conflict, HttpError } = require('../utils/errors');
const audit = require('./auditService');

const BCRYPT_COST = 12;
const MAX_FAILED = 5;
const LOCK_MINUTES = 15;
const PUBLIC_COLS = 'id, name, email, phone, role, active, preferred_locale, last_login_at, created_at';

// Hash ficticio para igualar el tiempo de respuesta cuando el correo no existe
// (evita enumerar cuentas midiendo tiempos).
const DUMMY_HASH = bcrypt.hashSync('dummy-password-for-timing', BCRYPT_COST);

async function register({ name, email, password, phone, preferred_locale }) {
  const exists = await one('SELECT 1 FROM users WHERE lower(email) = lower($1)', [email]);
  if (exists) throw conflict('email_taken', 'Ya existe una cuenta registrada con ese correo.');
  const hash = await bcrypt.hash(password, BCRYPT_COST);
  const user = await one(
    `INSERT INTO users (name, email, password_hash, phone, role, preferred_locale)
     VALUES ($1, lower($2), $3, $4, 'client', $5) RETURNING ${PUBLIC_COLS}, token_version`,
    [name, email, hash, phone ?? null, preferred_locale ?? 'es']
  );
  const token = signToken(user);
  delete user.token_version;
  return { user, token };
}

async function login({ email, password }, ip) {
  const user = await one('SELECT * FROM users WHERE lower(email) = lower($1)', [email]);
  const invalid = new HttpError(401, 'invalid_credentials', 'Correo o contraseña incorrectos.');
  if (!user) { await bcrypt.compare(password, DUMMY_HASH); throw invalid; }
  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    throw new HttpError(429, 'account_locked', 'Demasiados intentos fallidos. Intenta de nuevo en unos minutos.');
  }
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok || !user.active) {
    if (!ok) {
      const failed = user.failed_logins + 1;
      const lock = failed >= MAX_FAILED;
      await query(
        `UPDATE users SET failed_logins = $2, locked_until = CASE WHEN $3 THEN now() + make_interval(mins => $4) ELSE NULL END WHERE id = $1`,
        [user.id, lock ? 0 : failed, lock, LOCK_MINUTES]
      );
      if (failed >= MAX_FAILED) await audit.record({ userId: user.id, req: { ip }, action: 'auth.locked', entity: 'user', entityId: user.id });
    }
    throw invalid;
  }
  await query('UPDATE users SET failed_logins = 0, locked_until = NULL, last_login_at = now() WHERE id = $1', [user.id]);
  const token = signToken(user);
  const safe = await one(`SELECT ${PUBLIC_COLS} FROM users WHERE id = $1`, [user.id]);
  return { user: safe, token };
}

async function getById(id) {
  return one(`SELECT ${PUBLIC_COLS} FROM users WHERE id = $1`, [id]);
}

async function updateProfile(id, { name, phone, preferred_locale }) {
  return one(
    `UPDATE users SET name = COALESCE($2, name), phone = COALESCE($3, phone), preferred_locale = COALESCE($4, preferred_locale)
      WHERE id = $1 RETURNING ${PUBLIC_COLS}`,
    [id, name ?? null, phone ?? null, preferred_locale ?? null]
  );
}

/** Cambia la contraseña e invalida todas las sesiones anteriores. */
async function changePassword(id, { current_password, new_password }, req) {
  const user = await one('SELECT * FROM users WHERE id = $1', [id]);
  if (!user || !(await bcrypt.compare(current_password, user.password_hash))) {
    throw badRequest('wrong_password', 'La contraseña actual no es correcta.');
  }
  const hash = await bcrypt.hash(new_password, BCRYPT_COST);
  const updated = await one(
    'UPDATE users SET password_hash = $2, token_version = token_version + 1 WHERE id = $1 RETURNING id, role, token_version',
    [id, hash]
  );
  await audit.record({ req, action: 'auth.password_changed', entity: 'user', entityId: id });
  return { token: signToken(updated) };
}

/** Cierra todas las sesiones del usuario (incluida la actual). */
async function logoutAll(id, req) {
  await query('UPDATE users SET token_version = token_version + 1 WHERE id = $1', [id]);
  await audit.record({ req, action: 'auth.logout_all', entity: 'user', entityId: id });
}

// ---------- Administración de usuarios ----------

async function list({ role, search, limit = 50, offset = 0 }) {
  const rows = await query(
    `SELECT u.id, u.name, u.email, u.phone, u.role, u.active, u.created_at, u.last_login_at,
            (SELECT COUNT(*)::int FROM orders o WHERE o.user_id = u.id) AS orders_count,
            COUNT(*) OVER()::int AS total_count
       FROM users u
      WHERE ($1::text IS NULL OR u.role = $1)
        AND ($2::text IS NULL OR u.name ILIKE $2 OR u.email ILIKE $2)
      ORDER BY u.created_at DESC LIMIT $3 OFFSET $4`,
    [role ?? null, search ? `%${search}%` : null, limit, offset]
  );
  return { users: rows.map(({ total_count: _total, ...r }) => r), total: rows[0]?.total_count ?? 0 };
}

async function adminGet(id, { includeContact }) {
  const user = await getById(id);
  if (!user) throw notFound('user_not_found', 'Usuario no encontrado.');
  const orders = await query(
    `SELECT id, order_number, total_cents, status, payment_status, created_at FROM orders WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
    [id]
  );
  if (!includeContact) delete user.phone;
  return { user, orders };
}

/** Cambia rol o estado. Invalida sesiones del afectado. Siempre debe quedar un admin activo. */
async function adminUpdate(id, { role, active }, req) {
  return withTransaction(async (client) => {
    const before = await one(`SELECT ${PUBLIC_COLS} FROM users WHERE id = $1 FOR UPDATE`, [id], client);
    if (!before) throw notFound('user_not_found', 'Usuario no encontrado.');
    if (id === req.user.id && (role && role !== before.role || active === false)) {
      throw badRequest('self_change', 'No puedes cambiar tu propio rol ni desactivarte.');
    }
    const after = await one(
      `UPDATE users SET role = COALESCE($2, role), active = COALESCE($3, active), token_version = token_version + 1
        WHERE id = $1 RETURNING ${PUBLIC_COLS}`,
      [id, role ?? null, active ?? null],
      client
    );
    const { admins } = await one("SELECT COUNT(*)::int AS admins FROM users WHERE role = 'admin' AND active", [], client);
    if (admins < 1) throw conflict('last_admin', 'Debe quedar al menos un administrador activo.');
    await audit.record({ req, action: 'user.update', entity: 'user', entityId: id, before, after }, client);
    return after;
  });
}

/** Crea una cuenta de personal con contraseña temporal (se muestra una sola vez). */
async function createStaff({ name, email, role }, req) {
  const exists = await one('SELECT 1 FROM users WHERE lower(email) = lower($1)', [email]);
  if (exists) throw conflict('email_taken', 'Ya existe una cuenta con ese correo.');
  const temp = crypto.randomBytes(9).toString('base64url') + '9a';
  const hash = await bcrypt.hash(temp, BCRYPT_COST);
  const user = await one(
    `INSERT INTO users (name, email, password_hash, role) VALUES ($1, lower($2), $3, $4) RETURNING ${PUBLIC_COLS}`,
    [name, email, hash, role]
  );
  await audit.record({ req, action: 'user.create_staff', entity: 'user', entityId: user.id, after: { email, role } });
  return { user, temporary_password: temp };
}

/**
 * Restablece la contraseña de otra persona (olvido de contraseña sin correo).
 * Genera una temporal que se muestra una sola vez y cierra todas sus sesiones.
 */
async function resetPassword(id, req) {
  if (id === req.user.id) throw badRequest('self_change', 'Para tu propia cuenta usa "Cambiar contraseña" en tu perfil.');
  const user = await one('SELECT id, email FROM users WHERE id = $1', [id]);
  if (!user) throw notFound('user_not_found', 'Usuario no encontrado.');
  const temp = crypto.randomBytes(9).toString('base64url') + '7k';
  await query(
    'UPDATE users SET password_hash = $2, token_version = token_version + 1, failed_logins = 0, locked_until = NULL WHERE id = $1',
    [id, await bcrypt.hash(temp, BCRYPT_COST)]
  );
  await audit.record({ req, action: 'user.password_reset', entity: 'user', entityId: id });
  return { temporary_password: temp };
}

// ---------- Privacidad: acceso y eliminación de datos personales ----------

async function exportData(id) {
  const user = await getById(id);
  const orders = await query(
    `SELECT o.order_number, o.created_at, o.status, o.payment_status, o.total_cents, o.currency_code, o.delivery_type,
            o.customer_name, o.customer_phone, o.customer_email,
            (SELECT jsonb_agg(jsonb_build_object('product', oi.product_name, 'variant', oi.variant_name, 'quantity', oi.quantity, 'subtotal_cents', oi.subtotal_cents))
               FROM order_items oi WHERE oi.order_id = o.id) AS items
       FROM orders o WHERE o.user_id = $1 ORDER BY o.created_at`,
    [id]
  );
  const addresses = await query('SELECT recipient_name, phone, address, reference, created_at FROM delivery_addresses WHERE user_id = $1', [id]);
  return { exported_at: new Date().toISOString(), user, orders, addresses };
}

/**
 * Elimina la cuenta: anonimiza datos personales y conserva los registros de
 * venta (importes, productos, fechas) que pueden ser exigibles contablemente.
 * El plazo y alcance de conservación debe validarlo un profesional (ver docs/LEGAL.md).
 */
async function deleteAccount(id, { password }, req) {
  const user = await one('SELECT * FROM users WHERE id = $1', [id]);
  if (!user || !(await bcrypt.compare(password, user.password_hash))) throw badRequest('wrong_password', 'La contraseña no es correcta.');
  if (user.role === 'admin') {
    const { admins } = await one("SELECT COUNT(*)::int AS admins FROM users WHERE role = 'admin' AND active");
    if (admins <= 1) throw conflict('last_admin', 'No puedes eliminar la única cuenta de administrador.');
  }
  await withTransaction(async (client) => {
    const anonEmail = `eliminado-${id}-${crypto.randomBytes(4).toString('hex')}@invalid.local`;
    await client.query(
      `UPDATE users SET name = 'Cuenta eliminada', email = $2, phone = NULL, active = FALSE, password_hash = $3,
              token_version = token_version + 1 WHERE id = $1`,
      [id, anonEmail, await bcrypt.hash(crypto.randomBytes(24).toString('hex'), 4)]
    );
    await client.query(
      `UPDATE orders SET customer_name = 'Cliente eliminado', customer_phone = '—', customer_email = NULL WHERE user_id = $1`, [id]);
    await client.query(
      `UPDATE delivery_addresses SET recipient_name = '—', phone = '—', address = '—', reference = NULL, latitude = NULL, longitude = NULL WHERE user_id = $1`, [id]);
    await audit.record({ req, userId: id, action: 'user.deleted_by_owner', entity: 'user', entityId: id }, client);
  });
}

module.exports = {
  register, login, getById, updateProfile, changePassword, logoutAll,
  list, adminGet, adminUpdate, createStaff, resetPassword, exportData, deleteAccount, BCRYPT_COST,
};
