function createAuthError(code) {
  const err = new Error(code);
  err.code = code;
  return err;
}

module.exports = {
  createAuthError
};
