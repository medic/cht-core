const utils = require('./utils');
const RECURSION_LIMIT = 50;

// Minifies things you would attach to another doc:
//   doc.parent = minify(doc.parent)
// Not:
//   minify(doc)
const minifyLineage = (parent) => {
  if (!parent || !parent._id) {
    return parent;
  }

  const docId = parent._id;
  const result = { _id: parent._id };
  let minified = result;
  for (let guard = RECURSION_LIMIT; parent.parent && parent.parent._id; --guard) {
    if (guard === 0) {
      throw Error(`Could not minify ${docId}, possible parent recursion.`);
    }

    minified.parent = { _id: parent.parent._id };
    minified = minified.parent;
    parent = parent.parent;
  }

  return result;
};

/**
 * Remove all hyrdrated items and leave just the ids
 * @param {Object} doc The doc to minify
 */
const minify = (doc) => {
  if (!doc) {
    return;
  }
  if (doc.parent) {
    doc.parent = minifyLineage(doc.parent);
  }
  if (doc.contact && doc.contact._id) {
    const miniContact = { _id: doc.contact._id };
    if (doc.contact.parent) {
      miniContact.parent = minifyLineage(doc.contact.parent);
    }
    doc.contact = miniContact;
  }
  if (doc.type === 'data_record') {
    delete doc.patient;
    delete doc.place;
  }

  if (utils.validLinkedDocs(doc)) {
    Object.keys(doc.linked_docs).forEach(key => {
      doc.linked_docs[key] = utils.getId(doc.linked_docs[key]);
    });
  }
};

module.exports = {
  minify,
  minifyLineage,
};
