const { v7: uuid } = require('uuid');
const db = require('../db');
const { BULK_OPERATIONS, PREFIXES } = require('@medic/constants');

const { OPERATIONS_ATTACHMENT, STATUSES } = BULK_OPERATIONS;
const { BULK_OPERATION_LOG: LOG_ID_PREFIX, BULK_OPERATION_ACTION: ACTION_ID_PREFIX } = PREFIXES;
const OPERATIONS_CONTENT_TYPE = 'application/json';

const getOperationUuid = (operationId) => operationId.slice(LOG_ID_PREFIX.length);
const generateOperationId = () => `${LOG_ID_PREFIX}${uuid()}`;
const generateActionId = (operationId) => `${ACTION_ID_PREFIX}${getOperationUuid(operationId)}:${uuid()}`;

// Params live in an attachment so advancing the cursor as Sentinel batches does not rewrite them.
const encodeOperations = (operations) => ({
  content_type: OPERATIONS_CONTENT_TYPE,
  data: Buffer.from(JSON.stringify(operations)).toString('base64'),
});

const buildActionDoc = (operationId, action, operations) => ({
  _id: generateActionId(operationId),
  bulk_operation_id: operationId,
  action,
  cursor: 0,
  total: operations.length,
  _attachments: {
    [OPERATIONS_ATTACHMENT]: encodeOperations(operations),
  },
});

const buildLogAction = (action, totalChangesCount, date) => ({
  status: STATUSES.QUEUED,
  action,
  updated_date: date,
  total_changes_count: totalChangesCount,
});

const buildBulkOperation = (actionOperations) => {
  const date = new Date();
  const operationId = generateOperationId();
  const actions = actionOperations.map(({ action, operations }) => buildActionDoc(operationId, action, operations));

  const logActions = {};
  actions.forEach((actionDoc) => {
    logActions[actionDoc._id] = buildLogAction(actionDoc.action, actionDoc.total, date);
  });

  const log = {
    _id: operationId,
    start_date: date,
    actions: logActions,
  };

  return { log, actions };
};

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
 * Queues a bulk operation: writes the log document to medic-logs (the status record the polling
 * endpoint reads) and one action document per action type to medic-sentinel (what the Sentinel
 * listener processes). The log is written first so it exists before the listener picks up an action.
 * Action groups with no operations are skipped.
 * @param {Object[]} actionOperations - one group per action type
 * @param {string} actionOperations[].action - the action type (`archive`, `set-contact`, `delete-user`)
 * @param {Object[]} actionOperations[].operations - the per-item params for that action
 * @returns {Promise<string>} the bulk operation id
 */
const queue = async (actionOperations) => {
  const nonEmpty = actionOperations.filter(({ operations }) => operations.length);
  const { log, actions } = buildBulkOperation(nonEmpty);

  await db.medicLogs.put(log);
  // saveDocs checks each result; bulkDocs alone does not reject when an individual doc fails.
  return db.saveDocs(db.sentinel, actions).then(() => log._id);
};

module.exports = {
  getLog,
  queue,
};
