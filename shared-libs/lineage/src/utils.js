const contactTypeUtils = require('@medic/contact-types-utils');
const _ = require('lodash/core');
const { DOC_TYPES } = require('@medic/constants');

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
  return isContact(doc) && _.isObject(doc.linked_docs) && !_.isArray(doc.linked_docs);
};

const isReport = (doc) => doc.type === DOC_TYPES.DATA_RECORD;
const getPatientId = (doc) => (doc.fields && (doc.fields.patient_id || doc.fields.patient_uuid)) || doc.patient_id;
const getPlaceId = (doc) => (doc.fields && doc.fields.place_id) || doc.place_id;


module.exports = {
  getId,
  validLinkedDocs,
  isReport,
  getPatientId,
  getPlaceId,
};
