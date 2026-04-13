function replaceBusinessNameInNodes(nodes, businessName) {
  if (!Array.isArray(nodes)) return [];
  const normalizedBusinessName = (businessName || '').toString().trim();
  if (!normalizedBusinessName) return nodes;

  return nodes.map((node) => {
    if (!node || typeof node !== 'object') return node;
    const message = typeof node.message === 'string'
      ? node.message.replace(/\[business_name\]/gi, normalizedBusinessName)
      : node.message;

    return {
      ...node,
      message
    };
  });
}

module.exports = {
  replaceBusinessNameInNodes
};
