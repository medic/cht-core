const auth = require('../auth');
const serverUtils = require('../server-utils');
const bulkOperations = require('./bulk-operations');
const planners = require('./bulk-operation-planners');
const { NotFoundError } = require('../errors');
const { BULK_OPERATIONS } = require('@medic/constants');

const { TYPES } = BULK_OPERATIONS;

/**
 * Builds the DELETE express handler for a contact type. The person and place endpoints delete a
 * hierarchy the same way, so they share this handler; each passes the pieces that make its endpoint
 * type-specific. `get` fetches the target as its own type and returns null for the wrong type, so a
 * place id cannot be deleted through the person endpoint or vice versa, and `type` names it for the
 * not-found message. The handler reads the `delete_users`/`dry_run` query params, asserts the
 * required permissions, and either returns a dry-run summary (200) or records the operation for
 * Sentinel to plan and run (202).
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
  const userCtx = await auth.assertPermissions(req, { isOnline: true, hasAll: permissions });

  const { uuid } = req.params;
  const contact = await get(uuid);
  if (!contact) {
    return serverUtils.error(new NotFoundError(`${type} not found`), req, res);
  }

  const params = { contact_id: uuid, delete_users: deleteUsers };
  // Advisory: the caller is told now rather than being handed an operation that can only fail.
  await planners.validate(TYPES.DELETE_CONTACT, params);

  if (dryRun) {
    const { summary } = await planners.plan(TYPES.DELETE_CONTACT, params);
    return res.status(200).json({ summary });
  }

  const id = await bulkOperations.queue(TYPES.DELETE_CONTACT, params, userCtx.name);
  return res.status(202).json({ id });
});

module.exports = {
  handleDelete,
};
