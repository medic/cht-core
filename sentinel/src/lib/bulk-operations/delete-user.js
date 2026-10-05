const logger = require('@medic/logger');
const db = require('../../db');
const config = require('../../config');
const dataContext = require('../../data-context');
const { PREFIXES } = require('@medic/constants');
const { isRetryable, statusOf } = require('./errors');

const userManagement = require('@medic/user-management')(config, db, dataContext);

const isMissing = (err) => statusOf(err) === 404;

/**
 * Removes one user through the existing user-delete path. A user that is already gone counts as
 * done, so running the batch again converges. A failure worth repeating is left to the caller: it
 * stops the batch rather than failing this one operation.
 * @returns {Promise<boolean>} whether it failed for good
 */
const removeUser = async (op, actionId) => {
  try {
    await userManagement.users.deleteUser(op.id.replace(PREFIXES.COUCH_USER, ''));
    return false;
  } catch (err) {
    if (isMissing(err)) {
      // Already deleted, by us on an earlier attempt or by someone else.
      return false;
    }
    if (isRetryable(err)) {
      throw err;
    }

    logger.error(`bulk-operations: delete-user failed for ${op.id} (action ${actionId}): %o`, err);
    return true;
  }
};

const deleteUser = async (batch, actionId) => {
  const failed = [];
  for (const op of batch) {
    if (!op.id) {
      logger.error(`bulk-operations: delete-user skipped an operation with no id (action ${actionId})`);
      failed.push(op);
    } else if (await removeUser(op, actionId)) { // NOSONAR: the users go one at a time
      failed.push(op);
    }
  }
  return failed;
};

module.exports = { deleteUser };
