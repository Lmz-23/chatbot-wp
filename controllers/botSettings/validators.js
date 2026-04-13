function getBusinessIdFromUser(req) {
  return req.user && req.user.businessId ? req.user.businessId : null;
}

function getScopedBusinessId(req) {
  const user = req.user || null;
  const requestedBusinessId = req.query && typeof req.query.businessId === 'string'
    ? req.query.businessId.trim()
    : '';

  if (user && user.platformRole === 'PLATFORM_ADMIN' && requestedBusinessId) {
    return requestedBusinessId;
  }

  return getBusinessIdFromUser(req);
}

function canManageBotSettings(req) {
  const user = req.user || null;
  if (!user) return false;
  if (user.platformRole === 'PLATFORM_ADMIN') return true;
  return user.businessRole === 'OWNER';
}

function validateAccessAndScope(req) {
  if (!canManageBotSettings(req)) {
    return { error: { status: 403, body: { error: 'forbidden' } } };
  }

  const businessId = getScopedBusinessId(req);
  if (!businessId) {
    return { error: { status: 403, body: { error: 'forbidden' } } };
  }

  return { businessId };
}

function validateNodesPayload(body) {
  const nodes = body && body.nodes;
  if (!Array.isArray(nodes)) {
    return { error: { status: 400, body: { error: 'nodes must be an array' } } };
  }

  return { nodes };
}

module.exports = {
  canManageBotSettings,
  getScopedBusinessId,
  validateAccessAndScope,
  validateNodesPayload
};
