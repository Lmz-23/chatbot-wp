function createDedupeRegistry({ logger, ttlMs }) {
  const processed = new Map();

  function register(scopeKey, messageId, metadata = {}) {
    const seen = processed.get(scopeKey) || new Set();
    if (seen.has(messageId)) {
      if (logger && typeof logger.info === 'function') {
        logger.info('duplicate_message_ignored', metadata);
      }
      return false;
    }

    seen.add(messageId);
    processed.set(scopeKey, seen);

    setTimeout(() => {
      const scopedSet = processed.get(scopeKey);
      if (!scopedSet) return;
      scopedSet.delete(messageId);
      if (scopedSet.size === 0) {
        processed.delete(scopeKey);
      }
    }, ttlMs);

    return true;
  }

  return {
    register
  };
}

module.exports = {
  createDedupeRegistry
};
