const { v7: uuid } = require('uuid');
const logger = require('@medic/logger');
const db = require('../../db');
const config = require('../../config');
const dataContext = require('../../data-context');
const { BULK_OPERATIONS, PREFIXES } = require('@medic/constants');
const { setContact } = require('./set-contact');
const { setParent } = require('./set-parent');
const { deleteUser } = require('./delete-user');
const { deleteDocs } = require('./delete');

const planners = require('@medic/bulk-operations')(config, db, dataContext);

const { ACTIONS, STATUSES, OPERATIONS_ATTACHMENT } = BULK_OPERATIONS;
const { BULK_OPERATION_LOG: LOG_ID_PREFIX, BULK_OPERATION_ACTION: ACTION_ID_PREFIX } = PREFIXES;

const BATCH_SIZE = 100;
const RETRY_TIMEOUT = 60000;
const OPERATIONS_CONTENT_TYPE = 'application/json';

const HANDLERS = {
  [ACTIONS.SET_CONTACT]: setContact,
  [ACTIONS.SET_PARENT]: setParent,
  [ACTIONS.DELETE_USER]: deleteUser,
  [ACTIONS.DELETE]: deleteDocs,
};

const getOperationUuid = (logId) => logId.slice(LOG_ID_PREFIX.length);
// Actions are prefixed with their operation's uuid, so one range read finds every action it owns,
// and uuid v7 ids sort in creation order, which is the order the actions must run in.
const actionIdPrefix = (logId) => `${ACTION_ID_PREFIX}${getOperationUuid(logId)}:`;
const generateActionId = (logId) => `${actionIdPrefix(logId)}${uuid()}`;

// Params live in an attachment so advancing the cursor as Sentinel batches does not rewrite them.
const encodeOperations = (operations) => ({
  content_type: OPERATIONS_CONTENT_TYPE,
  data: Buffer.from(JSON.stringify(operations)).toString('base64'),
});

const buildActionDoc = (logId, action, operations) => ({
  _id: generateActionId(logId),
  bulk_operation_id: logId,
  action,
  cursor: 0,
  total: operations.length,
  _attachments: {
    [OPERATIONS_ATTACHMENT]: encodeOperations(operations),
  },
});

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

const getLog = async (logId) => {
  try {
    return await db.medicLogs.get(logId);
  } catch (err) {
    if (err.status === 404) {
      return null;
    }
    throw err;
  }
};

const updateLog = async (log, changes) => {
  await db.medicLogs.put({ ...log, ...changes, updated_date: new Date() });
};

// bulkDocs resolves with an error row rather than rejecting, so every row is checked: an action doc
// that was not written would silently drop that part of the operation.
const writeActionDocs = async (actionDocs) => {
  if (!actionDocs.length) {
    return;
  }

  const results = await db.sentinel.bulkDocs(actionDocs);
  const errors = results.filter(result => result.error);
  if (errors.length) {
    throw new Error(`bulk-operations: could not write action docs: ${JSON.stringify(errors)}`);
  }
};

const deleteDocsFrom = async (database, docs) => {
  if (docs.length) {
    await database.bulkDocs(docs.map(doc => ({ _id: doc._id, _rev: doc._rev, _deleted: true })));
  }
};

const getActionDocs = async (logId) => {
  const prefix = actionIdPrefix(logId);
  const result = await db.sentinel.allDocs({ startkey: prefix, endkey: `${prefix}\ufff0` });
  return result.rows.map(row => ({ _id: row.id, _rev: row.value.rev }));
};

const getOldestActionDoc = async () => {
  const result = await db.sentinel.allDocs({
    startkey: ACTION_ID_PREFIX,
    endkey: `${ACTION_ID_PREFIX}\ufff0`,
    include_docs: true,
    limit: 1,
  });
  return result.rows[0]?.doc;
};

const getOldestLog = async (status) => {
  const result = await db.medicLogs.query('logs/bulk_operations_by_status', {
    key: status,
    include_docs: true,
    reduce: false,
    limit: 1,
  });
  return result.rows[0]?.doc;
};

const runOperations = async (action, handler) => {
  const actionId = action._id;
  const operations = await readOperations(actionId);
  while (action.cursor < operations.length) {
    const batch = operations.slice(action.cursor, action.cursor + BATCH_SIZE);
    let failed;
    try {
      failed = await handler(batch, actionId);
    } catch (err) {
      // Unexpected handler error: treat the whole batch as failed so the rest still runs.
      logger.error(`bulk-operations: error handling action ${actionId}: %o`, err);
      failed = batch;
    } finally {
      action = await saveProgress(action, batch.length, failed);
    }
  }
  return action;
};

/**
 * Runs one action to completion and records the result on its log. Whether the operation as a whole
 * finished is not decided here: that is the job of the rule that finds a running log with no actions
 * left, once every action has been through this.
 */
const runAction = async (action, log) => {
  const handler = HANDLERS[action.action];
  let completed;
  try {
    if (!handler) {
      throw new Error(`bulk-operations: no handler for action "${action.action}"`);
    }
    completed = action.cursor < action.total ? await runOperations(action, handler) : action;
  } finally {
    completed = completed || action;
    const actions = { ...log.actions };
    actions[action._id] = {
      action: action.action,
      updated_date: new Date(),
      total_changes_count: action.total,
      failed_operations: completed.failed_operations,
    };
    await updateLog(log, { actions });
    await deleteDocsFrom(db.sentinel, [ completed ]);
    logger.info(`bulk-operations: completed action ${action._id}`);
  }
};

/**
 * Works out what an operation has to do and writes it down. The action docs land before the log says
 * `running`, so an interrupted plan is always "queued with action docs" and can be told apart from a
 * finished operation, which is "running with none".
 */
const planOperation = async (log) => {
  try {
    await planners.validate(log.type, log.params);
  } catch (err) {
    if (!(err instanceof planners.ValidationError)) {
      throw err;
    }
    logger.warn(`bulk-operations: ${log._id} is no longer valid: ${err.message}`);
    return updateLog(log, { status: STATUSES.FAILED, error: { message: err.message } });
  }

  const { summary, actions } = await planners.plan(log.type, log.params);
  const actionDocs = actions
    .filter(({ operations }) => operations.length)
    .map(({ action, operations }) => buildActionDoc(log._id, action, operations));

  await writeActionDocs(actionDocs);

  const logActions = {};
  actionDocs.forEach(({ _id, action, total }) => {
    logActions[_id] = { action, total_changes_count: total, updated_date: new Date() };
  });
  await updateLog(log, { status: STATUSES.RUNNING, summary, actions: logActions });
  logger.info(`bulk-operations: planned ${log._id} (${actionDocs.length} action(s))`);
};

// Every action has run, so the operation is done. It failed if any of them left failures behind.
const finishOperation = async (log) => {
  const failed = Object.values(log.actions || {}).some(entry => entry.failed_operations?.length);
  await updateLog(log, { status: failed ? STATUSES.FAILED : STATUSES.COMPLETED });
  logger.info(`bulk-operations: ${failed ? 'failed' : 'completed'} ${log._id}`);
};

// An interrupted plan, or actions left behind by an interrupted cleanup: neither has run anything,
// so throwing them away and (for the former) planning again is safe.
const discardActionDocs = async (logId) => {
  const docs = await getActionDocs(logId);
  logger.warn(`bulk-operations: discarding ${docs.length} stale action doc(s) for ${logId}`);
  await deleteDocsFrom(db.sentinel, docs);
};

/**
 * What an outstanding action doc means, which depends on the state of the operation that owns it.
 */
const workForAction = (action, log) => {
  if (log?.status === STATUSES.RUNNING) {
    return () => runAction(action, log);
  }

  if (log?.status === STATUSES.QUEUED) {
    // An interrupted plan: nothing has run yet, so throw the actions away and plan again.
    return async () => {
      await discardActionDocs(log._id);
      await planOperation(log);
    };
  }

  // Terminal, or the log is gone entirely: these actions must not run.
  return () => discardActionDocs(action.bulk_operation_id);
};

/**
 * Asks the database what to do next, in a fixed order of preference, and returns the work to do or
 * null when there is none. Each rule is one lookup and the first that finds something wins.
 */
const pullNext = async () => {
  const action = await getOldestActionDoc();
  if (action) {
    return workForAction(action, await getLog(action.bulk_operation_id));
  }

  const running = await getOldestLog(STATUSES.RUNNING);
  if (running) {
    return () => finishOperation(running);
  }

  const queued = await getOldestLog(STATUSES.QUEUED);
  if (queued) {
    return () => planOperation(queued);
  }

  return null;
};

let running = false;
let wakeRequested = false;

const runPass = async () => {
  running = true;
  try {
    do {
      wakeRequested = false;
      let work;
      while ((work = await pullNext())) {
        await work();
      }
    } while (wakeRequested); // a change landed mid-pass: look again before going idle
  } catch (err) {
    logger.error('bulk-operations: %o', err);
    setTimeout(wake, RETRY_TIMEOUT); // bookkeeping failed; the work is still in the database
  } finally {
    running = false;
  }
};

const wake = () => {
  wakeRequested = true;
  if (!running) {
    void runPass();
  }
};

const registerFeed = () => {
  db.medicLogs
    .changes({ live: true, since: 'now' })
    .on('change', (change) => {
      if (change.id.startsWith(LOG_ID_PREFIX)) {
        wake();
      }
    })
    .on('error', (err) => {
      logger.error('bulk-operations: changes feed error: %o', err);
      setTimeout(registerFeed, RETRY_TIMEOUT);
    });
};

const listen = async () => {
  // Register the feed before the first pass so an operation queued in between is not missed.
  registerFeed();
  // Whatever is already in the database is the initial queue; startup is just another pass.
  wake();
  logger.info('bulk-operations: listening for queued operations on medic-logs');
};

module.exports = {
  listen,
};
