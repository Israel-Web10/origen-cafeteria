const logger = require('../utils/logger');

/**
 * Convierte cualquier error en una respuesta JSON consistente:
 *   { error: "mensaje (es)", code: "codigo_estable", details? }
 * Los errores internos nunca exponen detalles (SQL, rutas, stack) al cliente.
 */
function errorHandler(err, req, res, next) {
  // Errores de PostgreSQL más frecuentes
  if (err.code === '23503') {
    return res.status(409).json({
      error: 'No se puede completar: el registro está relacionado con otros datos. Desactívalo en su lugar.',
      code: 'in_use',
    });
  }
  if (err.code === '23505') {
    return res.status(409).json({ error: 'Ya existe un registro con ese valor único.', code: 'duplicate' });
  }
  if (err.code === '23514') {
    return res.status(409).json({ error: 'La operación viola una regla de integridad (p. ej. stock negativo).', code: 'constraint' });
  }
  if (err.code === '57014') {
    return res.status(503).json({ error: 'La consulta tardó demasiado. Reduce el rango e intenta de nuevo.', code: 'timeout' });
  }
  if (err.name === 'MulterError') {
    const code = err.code === 'LIMIT_FILE_SIZE' ? 'file_too_large' : 'upload_error';
    return res.status(400).json({ error: `Error al subir archivo: ${err.message}`, code });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'La solicitud es demasiado grande.', code: 'payload_too_large' });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'JSON inválido.', code: 'invalid_json' });
  }

  const status = err.status && err.status >= 400 && err.status < 600 ? err.status : 500;
  if (status >= 500) {
    logger.error('request.failed', {
      method: req.method,
      path: req.path,
      message: err.message,
      stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
    });
    return res.status(status).json({ error: 'Error interno del servidor.', code: 'internal_error' });
  }
  const body = { error: err.message, code: err.code || 'error' };
  if (err.details) body.details = err.details;
  res.status(status).json(body);
}

function notFound(req, res) {
  res.status(404).json({ error: 'Ruta no encontrada.', code: 'route_not_found' });
}

module.exports = { errorHandler, notFound };
