const jwt = require('jsonwebtoken');

/**
 * Verifica el JWT en el header Authorization: Bearer <token>.
 * Si es válido, adjunta { id, role } en req.user.
 * Esta ruta es OBLIGATORIA (rechaza si no hay token).
 */
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'No autenticado. Token faltante.' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.id, role: payload.role, email: payload.email };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido o expirado.' });
  }
}

/**
 * Igual que requireAuth pero NO rechaza si no hay token: simplemente
 * deja req.user como null. Útil para endpoints que se comportan distinto
 * si el usuario está identificado (ej: crear pedido como invitado o logueado).
 */
function optionalAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme === 'Bearer' && token) {
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      req.user = { id: payload.id, role: payload.role, email: payload.email };
    } catch (err) {
      req.user = null;
    }
  } else {
    req.user = null;
  }
  next();
}

/**
 * Restringe el acceso a ciertos roles. Debe usarse después de requireAuth.
 * Uso: requireRole('admin')
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado.' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'No tienes permisos para esta acción.' });
    }
    next();
  };
}

module.exports = { requireAuth, optionalAuth, requireRole };
