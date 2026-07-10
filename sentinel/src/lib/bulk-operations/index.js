const async = require('async');
const logger = require('@medic/logger');
const db = require('../../db');
const { BULK_OPERATIONS } = require('@medic/constants');
const setContact = require('./set-contact');
const deleteUser = require('./delete-user');

const { ACTIONS, STATUSES, OPERATIONS_ATTACHMENT, ACTION_ID_PREFIX } = BULK_OPERATIONS;

const BATCH_SIZE = 100;
const RETRY_TIMEOUT = 60000;

const HANDLERS = {
  [ACTIONS.SET_CONTACT]: setContact,
  [ACTIONS.DELETE_USER]: deleteUser,
  // ACTIONS.ARCHIVE handler is added when #6615 lands.
};

const readOperations = async (actionId) => {
  const buffer = await db.sentinel.getAttachment(actionId, OPERATIONS_ATTACHMENT);
  return JSON.parse(buffer.toString());
};

// Base the cursor update on the latest doc (not our in-memory copy) and hand it back to the caller.
const saveProgress = async (action, processedCount, failed) => {
  const updated = await db.sentinel.get(action._id);
  updated.cursor = (updated.cursor || 0) + processedCount;
  if (failed.length) {
    updated.failed_operations = [ ...(updated.failed_operations || []), ...failed ];
  }
  await db.sentinel.put(updated);
  return updated;
};

// A missing log doc is skipped (and logged) rather than crashing Sentinel.
const recordResultOnLog = async (action) => {
  let log;
  try {
    log = await db.medicLogs.get(action.bulk_operation_id);
  } catch (err) {
    if (err.status === 404) {
      logger.error(
        `bulk-operations: log doc ${action.bulk_operation_id} not found; skipping result for ${action._id}`
      );
      return;
    }
    throw err;
  }

  const failed = action.failed_operations || [];
  log.actions = log.actions || {};
  log.actions[action._id] = {
    status: failed.length ? STATUSES.FAILED : STATUSES.COMPLETED,
    action: action.action,
    updated_date: new Date(),
    total_changes_count: action.total - failed.length,
    failed_operations: failed.length ? failed : undefined,
  };
  await db.medicLogs.put(log);
};

const deleteAction = async (action) => {
  const latest = await db.sentinel.get(action._id);
  await db.sentinel.put({ ...latest, _deleted: true });
};

// null when the action doc is gone (already processed and removed, e.g. queued twice at startup).
const getAction = async (actionId) => {
  try {
    return await db.sentinel.get(actionId);
  } catch (err) {
    if (err.status === 404) {
      return null;
    }
    throw err;
  }
};

const runOperations = async (action, handler, actionId) => {
  const operations = await readOperations(actionId);
  while (action.cursor < operations.length) {
    const batch = operations.slice(action.cursor, action.cursor + BATCH_SIZE);
    const failed = await handler(batch, actionId);
    action = await saveProgress(action, batch.length, failed);
  }
  return action;
};

const processAction = async (actionId) => {
  let action = await getAction(actionId);
  if (!action) {
    return;
  }

  const handler = HANDLERS[action.action];
  if (!handler) {
    throw new Error(`bulk-operations: no handler for action "${action.action}"`);
  }

  if (action.cursor < action.total) {
    action = await runOperations(action, handler, actionId);
  }

  await recordResultOnLog(action);
  await deleteAction(action);
  logger.info(`bulk-operations: completed action ${actionId}`);
};

// inProgress stops our own cursor writes (which show up on the feed) from re-queueing an in-flight
// action.
const inProgress = new Set();

const queue = async.queue((actionId, callback) => {
  processAction(actionId)
    .catch(err => logger.error(`bulk-operations: error processing action ${actionId}: %o`, err))
    .then(() => callback());
});

const enqueue = (actionId) => {
  if (inProgress.has(actionId)) {
    return;
  }
  inProgress.add(actionId);
  queue.push(actionId, () => inProgress.delete(actionId));
};

const loadInitialQueue = async () => {
  const result = await db.sentinel.allDocs({
    startkey: ACTION_ID_PREFIX,
    endkey: `${ACTION_ID_PREFIX}\ufff0`,
  });
  result.rows.forEach(row => enqueue(row.id));
};

const registerFeed = () => {
  db.sentinel
    .changes({ live: true, since: 'now' })
    .on('change', (change) => {
      if (!change.deleted && change.id.startsWith(ACTION_ID_PREFIX)) {
        enqueue(change.id);
      }
    })
    .on('error', /* istanbul ignore next: feed-error retry, exercised via integration tests */ (err) => {
      logger.error('bulk-operations: changes feed error: %o', err);
      setTimeout(registerFeed, RETRY_TIMEOUT);
    });
};

const listen = async () => {
  // Register the feed before loading the queue so an action written in between is not missed.
  registerFeed();
  await loadInitialQueue();
  logger.info('bulk-operations: listening for queued actions on medic-sentinel');
};

module.exports = {
  processAction,
  listen,
};
