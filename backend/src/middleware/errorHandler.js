/**
 * Error central. Los controladores llaman a next(err) o lanzan dentro de
 * un asyncHandler; aquí se convierte a una respuesta JSON consistente.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  console.error('[error]', err);

  // Errores de MySQL con foreign key (ej: intentar borrar algo referenciado)
  if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.code === 'ER_ROW_IS_REFERENCED') {
    return res.status(409).json({
      error: 'No se puede eliminar: este registro está siendo usado por otros datos. Desactívalo en su lugar.',
    });
  }

  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ error: 'Ya existe un registro con ese valor único.' });
  }

  // multer (subida de archivos)
  if (err.name === 'MulterError') {
    return res.status(400).json({ error: `Error al subir archivo: ${err.message}` });
  }

  const status = err.status || 500;
  const message = status === 500 ? 'Error interno del servidor.' : err.message;
  res.status(status).json({ error: message });
}

function notFound(req, res) {
  res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.originalUrl}` });
}

module.exports = { errorHandler, notFound };
