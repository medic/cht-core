
/*
Given a doc, replace the lineage information therein with "replaceWith"

startingFromIdInLineage (optional) - Will result in a partial replacement of the lineage. Only the part of the lineage "after" the parent
with _id=startingFromIdInLineage will be replaced by "replaceWith"
*/
const replaceLineage = (doc, lineageAttributeName, replaceWith, startingFromIdInLineage) => {
  const handleReplacement = (replaceInDoc, docAttr, replaceWith) => {
    if (!replaceWith) {
      const lineageWasDeleted = !!replaceInDoc[docAttr];
      replaceInDoc[docAttr] = undefined;
      return lineageWasDeleted;
    } else if (replaceInDoc[docAttr]) {
      replaceInDoc[docAttr]._id = replaceWith._id;
      replaceInDoc[docAttr].parent = replaceWith.parent;
    } else {
      replaceInDoc[docAttr] = replaceWith;
    }

    return true;
  };

  // Replace the full lineage
  if (!startingFromIdInLineage) {
    return handleReplacement(doc, lineageAttributeName, replaceWith);
  }

  // Replace part of a lineage
  let currentParent = doc[lineageAttributeName];
  while (currentParent) {
    if (currentParent._id === startingFromIdInLineage) {
      return handleReplacement(currentParent, 'parent', replaceWith);
    }
    currentParent = currentParent.parent;
  }

  return false;
};

/*
Function borrowed from shared-lib/lineage
*/
const minifyLineagesInDoc = doc => {
  const minifyLineage = lineage => {
    if (!lineage || !lineage._id) {
      return undefined;
    }

    const result = {
      _id: lineage._id,
      parent: minifyLineage(lineage.parent),
    };

    return result;
  };

  if (!doc) {
    return undefined;
  }
  
  if ('parent' in doc) {
    doc.parent = minifyLineage(doc.parent);
  }
  
  if ('contact' in doc) {
    doc.contact = minifyLineage(doc.contact);
    if (doc.contact && !doc.contact.parent) delete doc.contact.parent; // for unit test clarity
  }

  if (doc.type === 'data_record') {
    delete doc.patient;
  }
};

const createLineageFromDoc = doc => {
  if (!doc) {
    return undefined;
  }

  return {
    _id: doc._id,
    parent: doc.parent || undefined,
  };
};

/*
Given a lineage, return the ids therein
*/
const pluckIdsFromLineage = lineage => {
  const result = [];

  let current = lineage;
  while (current) {
    result.push(current._id);
    current = current.parent;
  }

  return result;
};

module.exports = {
  createLineageFromDoc,
  minifyLineagesInDoc,
  pluckIdsFromLineage,
  replaceLineage,
};
