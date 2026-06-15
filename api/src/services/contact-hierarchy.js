const db = require('../db');
const dataContext = require('./data-context');
const logger = require('@medic/logger');

const bulkDocsUtils = require('@medic/bulk-docs-utils')({ Promise, dataContext });

const BATCH_SIZE = 100;
const MAX_HIERARCHY_SIZE = 5000;

// contacts_by_depth emits a bare [ancestorId] key for a contact and each of its
// ancestors, so { key: [contactId] } returns one row per member of the subtree. Cap the
// query one past the max so an oversized hierarchy is rejected without loading it all.
const getSubtreeRows = async (contactId) => {
  const result = await db.medic.query('medic/contacts_by_depth', {
    key: [contactId],
    include_docs: true,
    limit: MAX_HIERARCHY_SIZE + 1,
  });
  return result.rows;
};

// reports_by_subject indexes by both shortcode (patient_id/place_id) and uuid, so a
// contact's reports are matched by either identifier.
const getSubjectKeys = (contacts) => {
  const keys = new Set();
  contacts.forEach((contact) => {
    keys.add(contact._id);
    const shortcode = contact.patient_id || contact.place_id;
    if (shortcode) {
      keys.add(shortcode);
    }
  });
  return [...keys];
};

const getSubjectReports = async (contacts) => {
  const keys = getSubjectKeys(contacts);
  const reportsById = new Map();
  for (let i = 0; i < keys.length; i += BATCH_SIZE) {
    const result = await db.medic.query('medic-client/reports_by_subject', {
      keys: keys.slice(i, i + BATCH_SIZE),
      include_docs: true,
    });
    result.rows.forEach(row => row.doc && reportsById.set(row.doc._id, row.doc));
  }
  return [...reportsById.values()];
};

const bulkWrite = async (docs) => {
  const errors = [];
  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const results = await db.medic.bulkDocs(docs.slice(i, i + BATCH_SIZE));
    results.forEach((result) => {
      if (result.error) {
        errors.push({ _id: result.id, error: result.error, reason: result.reason });
      }
    });
  }
  return errors;
};

const deleteHierarchy = async (contactId, { recursive = false } = {}) => {
  const rows = await getSubtreeRows(contactId);
  const subtreeSize = rows.length;
  if (!subtreeSize) {
    return null;
  }
  if (!recursive && subtreeSize > 1) {
    const error = new Error('Contact has descendants. Pass recursive=true to delete the whole hierarchy.');
    error.code = 400;
    throw error;
  }
  if (subtreeSize > MAX_HIERARCHY_SIZE) {
    const error = new Error(
      `Hierarchy too large to delete via the API (more than ${MAX_HIERARCHY_SIZE} contacts). Use cht-conf instead.`
    );
    error.code = 400;
    throw error;
  }

  const contacts = rows
    .map(row => row.doc)
    .filter(doc => doc && doc.type !== 'tombstone');
  const reports = await getSubjectReports(contacts);

  const deletedDocs = [...contacts, ...reports].map(doc => ({ ...doc, _deleted: true }));
  const deletedIds = new Set(deletedDocs.map(doc => doc._id));

  // Clear the primary-contact reference on any surviving parent of a deleted contact.
  const { docs: parents } = await bulkDocsUtils.updateParentContacts(deletedDocs);
  const parentUpdates = parents.filter(parent => !deletedIds.has(parent._id));

  const errors = await bulkWrite([...deletedDocs, ...parentUpdates]);
  const failedIds = new Set(errors.map(error => error._id));

  logger.info(`Deleted contact ${contactId}: ${contacts.length} contact(s), ${reports.length} report(s)`);

  return {
    deleted_contacts: contacts.filter(contact => !failedIds.has(contact._id)).length,
    deleted_reports: reports.filter(report => !failedIds.has(report._id)).length,
    errors,
  };
};

module.exports = {
  deleteHierarchy,
};
