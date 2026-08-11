const replaceEntireLineage = (replaceInDoc, lineageAttributeName, replaceWith) => {
  if (!replaceWith) {
    const lineageWasDeleted = !!replaceInDoc[lineageAttributeName];
    replaceInDoc[lineageAttributeName] = undefined;
    return lineageWasDeleted;
  }

  replaceInDoc[lineageAttributeName] = replaceWith;
  return true;
};

const replaceLineageForMove = (doc, lineageAttributeName, params) => {
  let currentElement = doc[lineageAttributeName];
  while (currentElement) {
    if (currentElement?._id === params.startingFromId) {
      return replaceEntireLineage(currentElement, 'parent', params.replaceWith);
    }

    currentElement = currentElement.parent;
  }

  return false;
};

const replaceLineageForMerge = (doc, lineageAttributeName, params) => {
  let currentElement = doc;
  let currentAttributeName = lineageAttributeName;
  while (currentElement) {
    if (currentElement[currentAttributeName]?._id === params.startingFromId) {
      return replaceEntireLineage(currentElement, currentAttributeName, params.replaceWith);
    }

    currentElement = currentElement[currentAttributeName];
    currentAttributeName = 'parent';
  }

  return false;
};

const replaceLineage = (doc, lineageAttributeName, params) => {
  // Replace the full lineage
  if (!params.startingFromId) {
    return replaceEntireLineage(doc, lineageAttributeName, params.replaceWith);
  }

  const selectedFunction = params.merge ? replaceLineageForMerge : replaceLineageForMove;
  return selectedFunction(doc, lineageAttributeName, params);
};

module.exports = {
  /**
   * Given a doc, replace the parent's lineage
   *
   * @param {Object} doc A CouchDB document containing a parent lineage (eg. parent.parent._id)
   * @param {Object} params
   * @param {Object} params.replaceWith The new hierarchy { parent: { _id: 'parent', parent: { _id: 'grandparent' } }
   * @param {string} params.startingFromId Only the part of the lineage "after" this id will be replaced
   * @param {boolean} params.merge When true, startingFromId is replaced and when false, startingFromId's parent is
   * replaced
   */
  replaceParentLineage: (doc, params) => {
    return replaceLineage(doc, 'parent', params);
  },

  /**
   * Given a doc, replace the contact's lineage
   *
   * @param {Object} doc A CouchDB document containing a contact lineage (eg. contact.parent._id)
   * @param {Object} params
   * @param {Object} params.replaceWith The new hierarchy { parent: { _id: 'parent', parent: { _id: 'grandparent' } }
   * @param {string} params.startingFromId Only the part of the lineage "after" this id will be replaced
   * @param {boolean} params.merge When true, startingFromId is replaced and when false, startingFromId's parent is
   * replaced
   */
  replaceContactLineage: (doc, params) => {
    return replaceLineage(doc, 'contact', params);
  },
};
