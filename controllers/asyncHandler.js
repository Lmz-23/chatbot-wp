/**
 * Envuelve handlers async de Express para centralizar captura de errores.
 *
 * @param {(req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) => Promise<any>} handler - Handler async principal.
 * @param {(err: any, req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) => any} onError - Mapper de error a respuesta HTTP.
 * @returns {(req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) => Promise<any>} Handler envuelto.
 */
function withAsyncHandler(handler, onError) {
  return async function wrappedHandler(req, res, next) {
    try {
      return await handler(req, res, next);
    } catch (err) {
      if (typeof onError === 'function') {
        return onError(err, req, res, next);
      }
      return next(err);
    }
  };
}

module.exports = {
  withAsyncHandler
};
