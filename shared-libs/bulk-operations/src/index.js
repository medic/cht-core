const { v7: uuid } = require('uuid');

/**
 * Document model for the bulk operation framework.
 *
 * A bulk operation is recorded with two kinds of document:
 *  - a single LOG document (stored in medic-logs) that tracks overall status and is read by the polling endpoint.
 *  - one ACTION document per action type (stored in medic-sentinel) that Sentinel processes in batches.
 *
 * Delete, move and merge all express their work as a set of these actions.
 */

const LOG_ID_PREFIX = 'bulk-operation:';
const ACTION_ID_PREFIX = 'bulk-operation-action:';

const ACTIONS = {
  ARCHIVE: 'archive',
  SET_CONTACT: 'set-contact',
  DELETE_USER: 'delete-user',
};

const STATUSES = {
  QUEUED: 'queued',
  COMPLETED: 'completed',
  FAILED: 'failed',
};

// The per-item params for each action live in an attachment rather than inline, so updating the
// action document's cursor as Sentinel works through the batches does not rewrite the whole list.
const OPERATIONS_ATTACHMENT = 'operations';
const OPERATIONS_CONTENT_TYPE = 'application/json';

const getOperationUuid = (operationId) => operationId.slice(LOG_ID_PREFIX.length);

const generateOperationId = () => `${LOG_ID_PREFIX}${uuid()}`;

const generateActionId = (operationId) => `${ACTION_ID_PREFIX}${getOperationUuid(operationId)}:${uuid()}`;

const encodeOperations = (operations) => ({
  content_type: OPERATIONS_CONTENT_TYPE,
  data: Buffer.from(JSON.stringify(operations)).toString('base64'),
});

const decodeOperations = (attachment) => JSON.parse(Buffer.from(attachment.data, 'base64').toString());

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

/**
 * Builds the documents that make up a single bulk operation.
 * @param {Array<{action: string, operations: Object[]}>} actionOperations - one entry per action type, each holding
 *   its list of per-item params
 * @param {Date} date - the operation start date, also the initial updated_date of every action
 * @returns {{log: Object, actions: Object[]}} the log document (for medic-logs) and the action documents
 *   (for medic-sentinel); the log's `actions` map is keyed by each action document's `_id`
 */
const buildBulkOperation = (actionOperations, date) => {
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

module.exports = {
  LOG_ID_PREFIX,
  ACTION_ID_PREFIX,
  ACTIONS,
  STATUSES,
  OPERATIONS_ATTACHMENT,
  buildBulkOperation,
  decodeOperations,
};
