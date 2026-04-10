// Maps CouchDB document types to Neo4j labels
const CONTACT_TYPES = ['contact', 'person', 'clinic', 'health_center', 'district_hospital'];

const typeToLabel = (type) => {
  const map = {
    person: 'Person',
    clinic: 'Clinic',
    health_center: 'HealthCenter',
    district_hospital: 'DistrictHospital',
    contact: 'Contact',
  };
  return map[type] || 'Contact';
};

const isContact = (doc) => CONTACT_TYPES.includes(doc.type);
const isDataRecord = (doc) => doc.type === 'data_record';

// Extract flat properties suitable for Neo4j (no nested objects)
const flattenForNeo4j = (doc) => {
  const props = {};
  for (const [key, value] of Object.entries(doc)) {
    if (key === '_revisions' || key === '_attachments') {
      continue;
    }
    if (value === null || value === undefined) {
      continue;
    }
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      props[key] = value;
    } else if (Array.isArray(value) && value.every(v => typeof v === 'string' || typeof v === 'number')) {
      props[key] = value;
    }
    // Skip nested objects - relationships are handled separately
  }
  return props;
};

const getContactProps = (doc) => {
  const props = flattenForNeo4j(doc);
  props.shortcode = doc.patient_id || doc.place_id || null;
  return props;
};

const getDataRecordProps = (doc) => {
  const props = flattenForNeo4j(doc);
  // Flatten commonly used nested fields
  if (doc.fields) {
    props.patient_id = doc.fields.patient_id || doc.patient_id || null;
    props.patient_uuid = doc.fields.patient_uuid || doc.patient_uuid || null;
    props.place_id = doc.fields.place_id || doc.place_id || null;
  }
  return props;
};

// Extract relationship targets from a contact document
const getContactRelationships = (doc) => {
  const rels = [];

  // Parent hierarchy: BELONGS_TO
  if (doc.parent && doc.parent._id) {
    rels.push({
      type: 'BELONGS_TO',
      targetId: doc.parent._id,
      targetLabel: 'Contact',
    });
  }

  // Primary contact relationship
  if (doc.contact) {
    const contactId = typeof doc.contact === 'object' ? doc.contact._id : doc.contact;
    if (contactId) {
      rels.push({
        type: 'HAS_PRIMARY_CONTACT',
        targetId: contactId,
        targetLabel: 'Contact',
      });
    }
  }

  return rels;
};

// Extract relationship targets from a data_record document
const getDataRecordRelationships = (doc) => {
  const rels = [];

  // Contact who submitted the report
  if (doc.contact && doc.contact._id) {
    rels.push({
      type: 'REPORTED_BY',
      targetId: doc.contact._id,
      targetLabel: 'Contact',
    });
  }

  // Subject of the report (patient or place)
  const subjectId = doc.patient_uuid || doc.patient_id
    || (doc.fields && (doc.fields.patient_uuid || doc.fields.patient_id))
    || doc.place_uuid || doc.place_id
    || (doc.fields && (doc.fields.place_uuid || doc.fields.place_id));

  if (subjectId) {
    rels.push({
      type: 'SUBJECT_OF',
      targetId: subjectId,
      targetLabel: 'Contact',
    });
  }

  return rels;
};

module.exports = {
  CONTACT_TYPES,
  typeToLabel,
  isContact,
  isDataRecord,
  flattenForNeo4j,
  getContactProps,
  getDataRecordProps,
  getContactRelationships,
  getDataRecordRelationships,
};
