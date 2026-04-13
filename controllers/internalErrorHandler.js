function createInternalErrorHandler(logger, eventName) {
  return function onError(err, req, res) {
    logger.error(eventName, {
      err: err && err.message ? err.message : err
    });
    return res.status(500).json({ error: 'internal_error' });
  };
}

module.exports = {
  createInternalErrorHandler
};
