const { v7: uuid } = require('uuid');
const db = require('../db');
const { BULK_OPERATIONS, PREFIXES } = require('@medic/constants');

const { STATUSES } = BULK_OPERATIONS;
const { BULK_OPERATION_LOG: LOG_ID_PREFIX } = PREFIXES;

const generateOperationId = () => `${LOG_ID_PREFIX}${uuid()}`;

// Guards against returning the other kinds of log doc that share the medic-logs database.
const getLog = async (id) => {
  if (!id?.startsWith(LOG_ID_PREFIX)) {
    return null;
  }

  try {
    const log = await db.medicLogs.get(id);
    delete log._rev;
    return log;
  } catch (err) {
    if (err.status === 404) {
      return null;
    }
    throw err;
  }
};

/**
 * Records the intent to run a bulk operation: a single log document in medic-logs holding the type
 * and the request parameters. Sentinel plans the operation when it runs it, so nothing else is
 * written here and the work itself is decided against the documents as they are then.
 * @param {string} type - the operation type, one of `BULK_OPERATIONS.TYPES`
 * @param {Object} params - the request parameters the planner needs
 * @param {string} requester - the username of the user who asked for it
 * @returns {Promise<string>} the bulk operation id
 */
const queue = async (type, params, requester) => {
  const date = new Date();
  const log = {
    _id: generateOperationId(),
    type,
    params,
    requester,
    status: STATUSES.QUEUED,
    start_date: date,
    updated_date: date,
  };

  await db.medicLogs.put(log);
  return log._id;
};

module.exports = {
  getLog,
  queue,
};
