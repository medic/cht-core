const db = require('../db');
const auth = require('../auth');
const serverUtils = require('../server-utils');
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
 * @param {Object} options
 * @param {boolean} options.deleteUsers - also remove users linked to the deleted contacts
 * @param {boolean} options.dryRun - return the breakdown without queuing anything
 * @returns {Promise<Object>} the breakdown of changes, plus the bulk operation id when the
 *   operation was queued (omitted for a dry run)
 * @throws {Error} a 404 when the contact does not exist, or a 400 when linked users would be left
 *   behind and `deleteUsers` was not requested
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

  const userOperations = deleteUsers ? userIds.map(userId => ({ id: userId })) : [];
  const breakdown = {
    archive: { contacts: contactIds.length, reports: reportIds.length },
    'set-contact': setContactOperations.length,
    'delete-user': userOperations.length,
  };

  if (dryRun) {
    return { breakdown };
  }

  const bulkOperationId = await bulkOperations.queue([
    { action: ACTIONS.ARCHIVE, operations: [ ...contactIds, ...reportIds ].map(docId => ({ id: docId })) },
    { action: ACTIONS.SET_CONTACT, operations: setContactOperations },
    { action: ACTIONS.DELETE_USER, operations: userOperations },
  ]);

  return { breakdown, id: bulkOperationId };
};

/**
 * Builds the DELETE express handler for a contact type. The person and place endpoints delete a
 * hierarchy the same way, so they share this handler; each passes the pieces that make its endpoint
 * type-specific. `get` fetches the target as its own type and returns null for the wrong type, so a
 * place id cannot be deleted through the person endpoint or vice versa, and `type` names it for the
 * not-found message. The handler reads the `delete_users`/`dry_run` query params, asserts the
 * required permissions, hands the type-agnostic work off to `deleteContactHierarchy`, and responds
 * with the breakdown (202 when queued, 200 for a dry run).
 * @param {Object} options
 * @param {Function} options.get - fetches the target contact by uuid, or null when it is not this type
 * @param {string} options.type - the contact type name, used in the not-found message
 * @returns {Function} the express request handler
 */
const handleDelete = ({ get, type }) => serverUtils.doOrError(async (req, res) => {
  const deleteUsers = req.query.delete_users === 'true';
  const dryRun = req.query.dry_run === 'true';
  const permissions = deleteUsers
    ? ['can_delete_contact_hierarchy', 'can_delete_users']
    : ['can_delete_contact_hierarchy'];
  await auth.assertPermissions(req, { isOnline: true, hasAll: permissions });

  const { uuid } = req.params;
  const contact = await get(uuid);
  if (!contact) {
    return serverUtils.error({ status: 404, message: `${type} not found` }, req, res);
  }

  const result = await module.exports.deleteContactHierarchy(uuid, { deleteUsers, dryRun });
  return res.status(dryRun ? 200 : 202).json(result);
});

module.exports = {
  deleteContactHierarchy,
  handleDelete,
};
