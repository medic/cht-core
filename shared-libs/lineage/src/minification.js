const RECURSION_LIMIT = 50;

const minifyLineage = function(parent) {
  if (!parent || !parent._id) {
    return parent;
  }

  const docId = parent._id;
  const result = { _id: parent._id };
  let minified = result;
  let guard = RECURSION_LIMIT;
  while (parent.parent && parent.parent._id) {
    if (--guard === 0) {
      throw Error('Could not hydrate/minify ' + docId + ', possible parent recursion.');
    }
    minified.parent = { _id: parent.parent._id };
    minified = minified.parent;
    parent = parent.parent;
  }
  return result;
};

const minify = function(doc) {
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
  }
};

module.exports = {
  minify,
  minifyLineage,
};
