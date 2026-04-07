const contactTypesUtils = require('@medic/contact-types-utils');

const SUBJECT_FIELDS = ['patient_id', 'patient_uuid', 'patient_name', 'place_id'];

const getLineage = (contact) => {
  const parts = [];
  while (contact) {
    if (contact._id) {
      parts.push(contact._id);
    }
    contact = contact.parent;
  }
  return parts;
};

const isMissingSubjectError = (error) => {
  return error.code === 'sys.missing_fields' &&
    error.fields &&
    error.fields.some(field => SUBJECT_FIELDS.includes(field));
};

const getSubject = (doc) => {
  const subject = {};
  const reference =
    doc.patient_id ||
    (doc.fields && doc.fields.patient_id) ||
    (doc.fields && doc.fields.patient_uuid) ||
    doc.place_id ||
    (doc.fields && doc.fields.place_id);
  const patientName = doc.fields && doc.fields.patient_name;
  if (patientName) {
    subject.name = patientName;
  }

  if (reference) {
    subject.value = reference;
    subject.type = 'reference';
  } else if (patientName) {
    subject.value = patientName;
    subject.type = 'name';
  } else if (doc.errors) {
    if (doc.errors.some(error => isMissingSubjectError(error))) {
      subject.type = 'unknown';
    }
  }

  return subject;
};

const isContact = (doc) => {
  const type = doc && doc.type;
  if (!type) {
    return false;
  }
  return type === 'contact' || contactTypesUtils.isHardcodedType(type);
};

const summarise = (doc) => {
  if (!doc) {
    return;
  }

  if (doc.type === 'data_record' && doc.form) {
    return {
      _id: doc._id,
      _rev: doc._rev,
      from: doc.from || doc.sent_by,
      phone: doc.contact && doc.contact.phone,
      form: doc.form,
      read: doc.read,
      valid: !doc.errors || !doc.errors.length,
      verified: doc.verified,
      reported_date: doc.reported_date,
      contact: doc.contact && doc.contact._id,
      lineage: getLineage(doc.contact && doc.contact.parent),
      subject: getSubject(doc),
      case_id: doc.case_id || (doc.fields && doc.fields.case_id)
    };
  }

  if (isContact(doc)) {
    return {
      _id: doc._id,
      _rev: doc._rev,
      name: doc.name || doc.phone,
      phone: doc.phone,
      type: doc.type,
      contact_type: doc.contact_type,
      contact: doc.contact && doc.contact._id,
      lineage: getLineage(doc.parent),
      date_of_death: doc.date_of_death,
      muted: doc.muted
    };
  }
};

module.exports = {
  summarise,
  isContact,
  getLineage,
  getSubject,
};
