// Error con código HTTP y un `code` estable que el frontend traduce
// (es/en/fr). `message` queda en español como texto de respaldo.
class HttpError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    if (details) this.details = details;
  }
}

const badRequest = (code, message, details) => new HttpError(400, code, message, details);
const notFound = (code = 'not_found', message = 'Recurso no encontrado.') => new HttpError(404, code, message);
const forbidden = (message = 'No tienes permisos para esta acción.') => new HttpError(403, 'forbidden', message);
const conflict = (code, message) => new HttpError(409, code, message);

module.exports = { HttpError, badRequest, notFound, forbidden, conflict };
