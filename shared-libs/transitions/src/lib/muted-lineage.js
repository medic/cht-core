const isMutedAtOrBefore = (mutedAt, beforeMillis) => {
  if (!mutedAt) {
    return false;
  }
  return !beforeMillis || new Date(mutedAt).getTime() <= beforeMillis;
};

const isMutedInLineage = (doc, beforeMillis) => {
  let parent = doc?.parent;
  while (parent) {
    if (isMutedAtOrBefore(parent.muted, beforeMillis)) {
      return parent._id;
    }
    parent = parent.parent;
  }
  return false;
};

// Like isMutedInLineage but also checks the doc itself, not only its ancestors.
const findMutedAncestor = (doc, beforeMillis) => {
  let node = doc;
  while (node) {
    if (isMutedAtOrBefore(node.muted, beforeMillis)) {
      return node._id;
    }
    node = node.parent;
  }
  return false;
};

module.exports = { isMutedInLineage, findMutedAncestor };
