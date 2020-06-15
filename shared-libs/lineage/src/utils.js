const contactTypeUtils = require('@medic/contact-types-utils');
const _ = require('lodash/core');

const isContact = doc => {
  if (!doc) {
    return;
  }

  return doc.type === 'contact' || contactTypeUtils.HARDCODED_TYPES.includes(doc.type);
};

const getId = (item) => item && (typeof item === 'string' ? item : item._id);

// don't process linked docs for non-contact types
// linked_docs property should be a key-value object
const validLinkedDocs = doc => {
  if (!doc || !isContact(doc) || !doc.linked_docs) {
    return;
  }

  return _.isObject(doc.linked_docs) && !_.isArray(doc.linked_docs);
};

module.exports = {
  getId,
  validLinkedDocs,
};
