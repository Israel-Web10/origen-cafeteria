const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { one } = require('../config/db');

const STAFF = ['manager', 'admin'];

function signToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, tv: user.token_version },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN, algorithm: 'HS256' }
  );
}

/**
 * Verifica el token y comprueba contra la BD que el usuario siga activo, con
 * el mismo rol y la misma `token_version` (permite revocar sesiones al cambiar
 * contraseña, desactivar la cuenta o cambiar el rol).
 */
async function resolveUser(req) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return null;
  let payload;
  try {
    payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
  } catch {
    return undefined; // token presente pero inválido/expirado
  }
  const user = await one(
    'SELECT id, name, email, role, active, token_version, preferred_locale FROM users WHERE id = $1',
    [payload.sub]
  );
  if (!user || !user.active || user.token_version !== payload.tv) return undefined;
  return { id: user.id, role: user.role, email: user.email, name: user.name, locale: user.preferred_locale };
}

function requireAuth(req, res, next) {
  resolveUser(req)
    .then((user) => {
      if (!user) {
        return res.status(401).json({
          error: user === null ? 'No autenticado.' : 'Sesión inválida o expirada.',
          code: user === null ? 'unauthenticated' : 'session_expired',
        });
      }
      req.user = user;
      next();
    })
    .catch(next);
}

function optionalAuth(req, res, next) {
  resolveUser(req)
    .then((user) => {
      req.user = user || null;
      next();
    })
    .catch(next);
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'No autenticado.', code: 'unauthenticated' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'No tienes permisos para esta acción.', code: 'forbidden' });
    }
    next();
  };
}

const requireStaff = [requireAuth, requireRole(...STAFF)];
const requireAdmin = [requireAuth, requireRole('admin')];

const isStaff = (user) => Boolean(user && STAFF.includes(user.role));

module.exports = { signToken, requireAuth, optionalAuth, requireRole, requireStaff, requireAdmin, isStaff, STAFF };
