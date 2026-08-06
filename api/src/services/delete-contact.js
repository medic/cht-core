const db = require('../db');
const auth = require('../auth');
const serverUtils = require('../server-utils');
const bulkOperations = require('./bulk-operations');
const { NotFoundError, BadRequestError } = require('../errors');
const { BULK_OPERATIONS } = require('@medic/constants');

const { ACTIONS } = BULK_OPERATIONS;

// contacts_by_depth returns one row per contact in the subtree, each carrying its uuid and shortcode.
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

// Match reports by uuid and shortcode, so a report recording only the shortcode is not missed.
const getReportIds = async (subjectKeys) => {
  const result = await db.medic.query('medic-client/reports_by_subject', { keys: subjectKeys });
  return [ ...new Set(result.rows.map(row => row.id)) ];
};

// Surviving places whose primary contact is being deleted; the current id guards a since-changed ref.
const getPrimaryContactClears = async (contactIds) => {
  const result = await db.medic.query('medic/contacts_by_primary_contact', { keys: contactIds });
  // Seeded with the deleted ids so those rows are skipped; grows as surviving places are collected.
  const seen = new Set(contactIds);
  const operations = [];
  result.rows.forEach(row => {
    if (seen.has(row.id)) {
      return;
    }
    seen.add(row.id);
    operations.push({ id: row.id, current_contact_id: row.key });
  });
  return operations;
};

// A place is a user's `facility_id` and a person can be their `contact_id`; either breaks the user.
const getLinkedUserIds = async (contactIds) => {
  const result = await db.users.query('users/users_by_field', {
    keys: contactIds.flatMap(id => [ [ 'facility_id', id ], [ 'contact_id', id ] ]),
  });
  return [ ...new Set(result.rows.map(row => row.id)) ];
};

/**
 * Gathers everything a contact-hierarchy delete touches and queues it as a bulk operation.
 * @param {string} id - the target contact id
 * @param {Object} options
 * @param {boolean} options.deleteUsers - also remove users linked to the deleted contacts
 * @param {boolean} options.dryRun - return the summary without queuing anything
 * @returns {Promise<Object>} the summary of changes, plus the bulk operation id when the operation
 *   was queued (omitted for a dry run)
 * @throws {Error} a 400 when linked users would be left behind and `deleteUsers` was not requested
 */
const deleteContactHierarchy = async (id, { deleteUsers, dryRun } = {}) => {
  const subtree = await getSubtree(id);
  const contactIds = subtree.rows.map(row => row.id);

  const [ reportIds, setContactOperations, userIds ] = await Promise.all([
    getReportIds(getSubjectKeys(subtree.rows)),
    getPrimaryContactClears(contactIds),
    getLinkedUserIds(contactIds),
  ]);

  if (userIds.length && !deleteUsers) {
    throw new BadRequestError(
      `${userIds.length} user(s) are linked to contacts in this hierarchy. ` +
        `Set delete_users=true (requires can_delete_users) to remove them.`
    );
  }

  const userOperations = userIds.map(userId => ({ id: userId }));
  const summary = {
    archive: { contacts: contactIds.length, reports: reportIds.length },
    'set-contact': setContactOperations.length,
    'delete-user': userOperations.length,
  };

  if (dryRun) {
    return { summary };
  }

  // Archive last, so contacts are removed only after the references to them are cleared.
  const bulkOperationId = await bulkOperations.queue([
    { action: ACTIONS.SET_CONTACT, operations: setContactOperations },
    { action: ACTIONS.DELETE_USER, operations: userOperations },
    { action: ACTIONS.ARCHIVE, operations: [ ...reportIds, ...contactIds ].map(docId => ({ id: docId })) },
  ]);

  return { summary, id: bulkOperationId };
};

/**
 * Builds the DELETE express handler for a contact type. The person and place endpoints delete a
 * hierarchy the same way, so they share this handler; each passes the pieces that make its endpoint
 * type-specific. `get` fetches the target as its own type and returns null for the wrong type, so a
 * place id cannot be deleted through the person endpoint or vice versa, and `type` names it for the
 * not-found message. The handler reads the `delete_users`/`dry_run` query params, asserts the
 * required permissions, hands the type-agnostic work off to `deleteContactHierarchy`, and responds
 * with the summary (202 when queued, 200 for a dry run).
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
    return serverUtils.error(new NotFoundError(`${type} not found`), req, res);
  }

  const result = await deleteContactHierarchy(uuid, { deleteUsers, dryRun });
  return res.status(dryRun ? 200 : 202).json(result);
});

module.exports = {
  handleDelete,
};
