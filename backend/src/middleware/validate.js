const { badRequest } = require('../utils/errors');

/**
 * Valida req.body / req.query / req.params con esquemas zod y reemplaza el
 * contenido por el resultado parseado: los controladores solo ven campos
 * conocidos y ya tipados (evita mass assignment y tipos inesperados).
 */
function validate({ body, query, params } = {}) {
  return (req, res, next) => {
    try {
      if (params) req.params = parse(params, req.params);
      if (query) req.query = parse(query, req.query);
      if (body) req.body = parse(body, req.body ?? {});
      next();
    } catch (err) {
      next(err);
    }
  };
}

function parse(schema, data) {
  const result = schema.safeParse(data);
  if (!result.success) {
    const first = result.error.issues[0];
    const field = first.path.join('.');
    throw badRequest('validation_error', `${field ? field + ': ' : ''}${first.message}`, {
      fields: result.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
    });
  }
  return result.data;
}

module.exports = { validate, parse };
