const logger = require('@medic/logger');
const db = require('../../db');
const config = require('../../config');
const dataContext = require('../../data-context');
const { PREFIXES } = require('@medic/constants');

const userManagement = require('@medic/user-management')(config, db, dataContext);

// Remove each linked user via the existing user-delete path; a failure fails only that op.
module.exports = async (batch, actionId) => {
  const failed = [];
  for (const op of batch) {
    if (!op.id) {
      logger.error(`bulk-operations: delete-user skipped an operation with no id (action ${actionId})`);
      failed.push(op);
      continue;
    }
    try {
      await userManagement.deleteUser(op.id.replace(PREFIXES.COUCH_USER, ''));
    } catch (err) {
      logger.error(`bulk-operations: delete-user failed for ${op.id} (action ${actionId}): %o`, err);
      failed.push(op);
    }
  }
  return failed;
};
