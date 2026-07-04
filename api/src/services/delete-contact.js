const db = require('../db');
const bulkOperations = require('./bulk-operations');
const { ACTIONS } = require('@medic/bulk-operations');

const httpError = (status, message) => {
  const err = new Error(message);
  err.status = status;
  return err;
};

// `contacts_by_depth` keyed by a single id returns one row per contact in that subtree (the target
// and every descendant). Each row carries the contact's uuid (row.id) and its shortcode
// (row.value.shortcode), the same pairing the replication authorization service uses.
const getSubtree = (id) => db.medic.query('medic/contacts_by_depth', { key: [id] });

const getSubjectKeys = (rows) => {
  const keys = [];
  rows.forEach(row => {
    keys.push(row.id);
    if (row.value?.shortcode) {
      keys.push(row.value.shortcode);
    }
  });
  return keys;
};

// Reports are matched by both the contact uuid and its shortcode, so a report that only records the
// shortcode is not missed.
const getReportIds = async (subjectKeys) => {
  if (!subjectKeys.length) {
    return [];
  }
  const result = await db.medic.query('medic-client/reports_by_subject', { keys: subjectKeys });
  return [ ...new Set(result.rows.map(row => row.id)) ];
};

// Places whose primary contact is one of the deleted contacts, excluding places that are being
// deleted themselves. Each keeps the current primary id so the set-contact handler can verify it
// has not changed before clearing the reference.
const getPrimaryContactClears = async (contactIds) => {
  const result = await db.medic.query('medic/contacts_by_primary_contact', { keys: contactIds });
  const deleted = new Set(contactIds);
  const seen = new Set();
  const operations = [];
  result.rows.forEach(row => {
    if (deleted.has(row.id) || seen.has(row.id)) {
      return;
    }
    seen.add(row.id);
    operations.push({ id: row.id, current_contact_id: row.key });
  });
  return operations;
};

// Users whose facility is one of the deleted contacts (only places have linked users).
const getLinkedUserIds = async (contactIds) => {
  const result = await db.users.query('users/users_by_field', {
    keys: contactIds.map(id => [ 'facility_id', id ]),
  });
  return [ ...new Set(result.rows.map(row => row.id)) ];
};

/**
 * Gathers everything a contact-hierarchy delete touches and queues it as a bulk operation.
 * @param {string} id - the target contact id
 * @param {{deleteUsers: boolean, dryRun: boolean}} options
 * @returns {Promise<{breakdown: Object, id?: string}>} the breakdown of changes, and the bulk
 *   operation id when the operation was queued
 * @throws a 404 when the contact does not exist, or a 400 when linked users would be left behind
 *   and `deleteUsers` was not requested
 */
const deleteContactHierarchy = async (id, { deleteUsers, dryRun } = {}) => {
  const subtree = await getSubtree(id);
  const contactIds = subtree.rows.map(row => row.id);
  if (!contactIds.length) {
    throw httpError(404, `Contact "${id}" not found`);
  }

  const [ reportIds, setContactOperations, userIds ] = await Promise.all([
    getReportIds(getSubjectKeys(subtree.rows)),
    getPrimaryContactClears(contactIds),
    getLinkedUserIds(contactIds),
  ]);

  if (userIds.length && !deleteUsers) {
    throw httpError(
      400,
      `${userIds.length} user(s) are linked to contacts in this hierarchy. ` +
        `Set delete_users=true (requires can_delete_users) to remove them.`
    );
  }

  const breakdown = {
    archive: { contacts: contactIds.length, reports: reportIds.length },
    'set-contact': setContactOperations.length,
    'delete-user': deleteUsers ? userIds.length : 0,
  };

  if (dryRun) {
    return { breakdown };
  }

  const bulkOperationId = await bulkOperations.queue([
    { action: ACTIONS.ARCHIVE, operations: [ ...contactIds, ...reportIds ].map(docId => ({ id: docId })) },
    { action: ACTIONS.SET_CONTACT, operations: setContactOperations },
    { action: ACTIONS.DELETE_USER, operations: deleteUsers ? userIds.map(userId => ({ id: userId })) : [] },
  ]);

  return { breakdown, id: bulkOperationId };
};

module.exports = {
  deleteContactHierarchy,
};
