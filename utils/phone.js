function normalizePhone(value) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/\D/g, '');
}

module.exports = { normalizePhone };
