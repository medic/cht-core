const isMutedInLineage = (doc, beforeMillis) => {
  let parent = doc && doc.parent;
  while (parent) {
    if (parent.muted && (beforeMillis ? new Date(parent.muted).getTime() <= beforeMillis : true)) {
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
    if (node.muted && (beforeMillis ? new Date(node.muted).getTime() <= beforeMillis : true)) {
      return node._id;
    }
    node = node.parent;
  }
  return false;
};

module.exports = { isMutedInLineage, findMutedAncestor };
