const logger = require('@medic/logger');
const db = require('../../db');
const config = require('../../config');
const dataContext = require('../../data-context');
const { PREFIXES } = require('@medic/constants');
const { RetryableError, isRetryableStatus, statusOf } = require('./errors');

const userManagement = require('@medic/user-management')(config, db, dataContext);

const isMissing = (err) => statusOf(err) === 404;

/**
 * Remove each linked user via the existing user-delete path. A user that is already gone counts as
 * done, so a re-run converges, and a failure that is worth another attempt stops the batch rather
 * than failing only that operation.
 */
/**
 * Removes one user.
 * @returns {Promise<boolean>} whether it failed for good
 * @throws {RetryableError} when it is worth another attempt
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
    if (isRetryableStatus(err)) {
      throw new RetryableError(
        `bulk-operations: delete-user could not remove ${op.id} (action ${actionId}): ${err.message || err}`,
        { cause: err }
      );
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
    } else if (await removeUser(op, actionId)) {
      failed.push(op);
    }
  }
  return failed;
};

module.exports = { deleteUser };
