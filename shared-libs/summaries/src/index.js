const contactTypesUtils = require('@medic/contact-types-utils');
const { DOC_TYPES } = require('@medic/constants');

const SUBJECT_FIELDS = new Set(['patient_id', 'patient_uuid', 'patient_name', 'place_id']);

const getLineage = (contact) => {
  const parts = [];
  let current = contact;
  while (current) {
    if (current._id) {
      parts.push(current._id);
    }
    current = current.parent;
  }
  return parts;
};

const isMissingSubjectError = (error) => {
  return error.code === 'sys.missing_fields'
    && Array.isArray(error.fields)
    && error.fields.some(field => SUBJECT_FIELDS.has(field));
};

const getReference = (doc) => {
  return doc.patient_id
    ?? doc.fields?.patient_id
    ?? doc.fields?.patient_uuid
    ?? doc.place_id
    ?? doc.fields?.place_id;
};

const getSubject = (doc) => {
  const subject = {};
  const reference = getReference(doc);
  const patientName = doc.fields?.patient_name;

  if (patientName) {
    subject.name = patientName;
  }

  if (reference) {
    subject.value = reference;
    subject.type = 'reference';
  } else if (patientName) {
    subject.value = patientName;
    subject.type = 'name';
  } else if (doc.errors?.some(error => isMissingSubjectError(error))) {
    subject.type = 'unknown';
  }

  return subject;
};

const isContact = (doc) => {
  const type = doc?.type;
  if (!type) {
    return false;
  }
  return type === 'contact' || contactTypesUtils.isHardcodedType(type);
};

const isReport = (doc) => {
  return doc?.type === DOC_TYPES.DATA_RECORD && typeof doc.form === 'string' && !!doc.form;
};

const summariseReport = (doc) => {
  return {
    _id: doc._id,
    _rev: doc._rev,
    from: doc.from ?? doc.sent_by,
    phone: doc.contact?.phone,
    form: doc.form,
    read: doc.read,
    valid: !doc.errors?.length,
    verified: doc.verified,
    reported_date: doc.reported_date,
    contact: doc.contact?._id,
    lineage: getLineage(doc.contact?.parent),
    subject: getSubject(doc),
    case_id: doc.case_id ?? doc.fields?.case_id,
  };
};

const summariseContact = (doc) => {
  return {
    _id: doc._id,
    _rev: doc._rev,
    name: doc.name ?? doc.phone,
    phone: doc.phone,
    type: doc.type,
    contact_type: doc.contact_type,
    contact: doc.contact?._id,
    lineage: getLineage(doc.parent),
    date_of_death: doc.date_of_death,
    muted: doc.muted,
  };
};

// Returns a compact summary of the given document, or `undefined` if the document is not a
// supported record type (contact or report).
const summarise = (doc) => {
  if (!doc) {
    return;
  }

  if (isReport(doc)) {
    return summariseReport(doc);
  }

  if (isContact(doc)) {
    return summariseContact(doc);
  }
};

module.exports = {
  summarise,
  summariseContact,
  summariseReport,
};
