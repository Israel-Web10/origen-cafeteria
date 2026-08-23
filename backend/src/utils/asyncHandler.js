// Envuelve controladores async para no repetir try/catch en cada uno.
// Cualquier error se pasa automáticamente a errorHandler.
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = asyncHandler;
