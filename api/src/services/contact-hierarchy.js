const db = require('../db');
const dataContext = require('./data-context');
const logger = require('@medic/logger');

const bulkDocsUtils = require('@medic/bulk-docs-utils')({ Promise, dataContext });

const BATCH_SIZE = 100;
const MAX_HIERARCHY_SIZE = 5000;
const MAX_WRITE_ATTEMPTS = 3;

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

// Match reports by the contact uuid only. reports_by_subject also indexes shortcodes
// (patient_id/place_id), but those are resolvable references rather than guaranteed-unique
// permanent ids, so matching on them risks deleting a report about a different contact that
// shares or has reused a shortcode. cht-conf's delete queries by uuid for the same reason.
const getSubjectReports = async (contacts) => {
  const ids = contacts.map(contact => contact._id);
  const reportsById = new Map();
  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    const keys = ids.slice(i, i + BATCH_SIZE);
    // Page through the results so a subject with a very large report volume does not load
    // every matching doc into memory in a single response.
    let skip = 0;
    let rows;
    do {
      const result = await db.medic.query('medic-client/reports_by_subject', {
        keys,
        include_docs: true,
        limit: BATCH_SIZE,
        skip,
      });
      rows = result.rows;
      rows.forEach(row => row.doc && reportsById.set(row.doc._id, row.doc));
      skip += rows.length;
    } while (rows.length >= BATCH_SIZE);
  }
  return [...reportsById.values()];
};

// Re-fetch fresh revisions for docs that hit a conflict and re-apply the intended change
// (deletion, or clearing a parent's primary-contact reference) so the retry is not stale.
const refreshConflicts = async (docs) => {
  const result = await db.medic.allDocs({ keys: docs.map(doc => doc._id), include_docs: true });
  const liveById = new Map();
  result.rows.forEach(row => row.doc && liveById.set(row.doc._id, row.doc));
  return docs
    .map((doc) => {
      const live = liveById.get(doc._id);
      if (!live) {
        return null;
      }
      return doc._deleted ? { ...live, _deleted: true } : { ...live, contact: null };
    })
    .filter(Boolean);
};

const bulkWrite = async (docs) => {
  const errors = [];
  let pending = docs;
  let attempt = 0;
  while (pending.length) {
    attempt += 1;
    const conflicts = [];
    for (let i = 0; i < pending.length; i += BATCH_SIZE) {
      const batch = pending.slice(i, i + BATCH_SIZE);
      const results = await db.medic.bulkDocs(batch);
      results.forEach((result, index) => {
        if (!result.error) {
          return;
        }
        // A conflict means another client wrote the doc first; retry with a fresh revision.
        if (result.error === 'conflict' && attempt < MAX_WRITE_ATTEMPTS) {
          conflicts.push(batch[index]);
        } else {
          errors.push({ _id: result.id, error: result.error, reason: result.reason });
        }
      });
    }
    if (!conflicts.length) {
      break;
    }
    pending = await refreshConflicts(conflicts);
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
