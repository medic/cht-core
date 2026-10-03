const { v7: uuid } = require('uuid');
const logger = require('@medic/logger');
const db = require('../../db');
const config = require('../../config');
const dataContext = require('../../data-context');
const { BULK_OPERATIONS, PREFIXES } = require('@medic/constants');
const { RetryableError, isRetryableStatus } = require('./errors');
const { setContact } = require('./set-contact');
const { setParent } = require('./set-parent');
const { deleteUser } = require('./delete-user');
const { deleteDocs } = require('./delete');

const planners = require('@medic/bulk-operations')(config, db, dataContext);

const { ACTIONS, STATUSES, OPERATIONS_ATTACHMENT } = BULK_OPERATIONS;
const { BULK_OPERATION_LOG: LOG_ID_PREFIX, BULK_OPERATION_ACTION: ACTION_ID_PREFIX } = PREFIXES;

const BATCH_SIZE = 100;
const RETRY_TIMEOUT = 60000;
const MINUTE = 60 * 1000;
const MAX_BACKOFF_MINUTES = 5;
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
  const updated = { ...log, ...changes, updated_date: new Date() };
  // A change set to undefined clears the field rather than storing it.
  Object.keys(updated).forEach(key => updated[key] === undefined && delete updated[key]);
  await db.medicLogs.put(updated);
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

/**
 * The cool-down before the next attempt: the first retry is immediate, then a minute, two, and so on
 * up to five, which it then stays at for as long as the failure lasts.
 */
const backoffFor = (errorCount) => Math.min(Math.max(errorCount - 1, 0), MAX_BACKOFF_MINUTES) * MINUTE;

const dueDateFor = (errorCount) => new Date(Date.now() + backoffFor(errorCount));

const isDue = (doc) => !doc.next_attempt_date || new Date(doc.next_attempt_date) <= new Date();

/**
 * Records that an attempt failed in a way that is worth repeating, so the work is presented again
 * once its cool-down has passed. Nothing else about the doc changes: the cursor stays where it was,
 * so the batch that failed is the batch that runs next.
 */
const scheduleRetry = async (database, doc, reason) => {
  // Counted off the latest revision rather than the copy we were handed, so a bump someone else
  // recorded in between is not overwritten. `error_count` is what the archiving jobs call it.
  const latest = await database.get(doc._id);
  const error_count = (latest.error_count || 0) + 1;
  const next_attempt_date = dueDateFor(error_count);
  await database.put({ ...latest, error_count, next_attempt_date });
  logger.warn(
    `bulk-operations: ${doc._id} failed ${error_count} time(s), retrying at ` +
      `${next_attempt_date.toISOString()}: ${reason}`
  );
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

// Running comes before queued in the view, so the oldest of the two is one round trip: an operation
// that is already under way is always finished before a new one is planned.
const getNextLog = async () => {
  const result = await db.medicLogs.query('logs/bulk_operations_by_status', {
    keys: [ STATUSES.RUNNING, STATUSES.QUEUED ],
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
      if (err instanceof RetryableError) {
        // The batch did not run, so the cursor stays put and this batch is the one tried next.
        throw err;
      }
      // Unexpected handler error: treat the whole batch as failed so the rest still runs.
      logger.error(`bulk-operations: error handling action ${actionId}: %o`, err);
      failed = batch;
    }
    action = await saveProgress(action, batch.length, failed);
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
  let unexpected;
  try {
    if (!handler) {
      throw new Error(`bulk-operations: no handler for action "${action.action}"`);
    }
    completed = action.cursor < action.total ? await runOperations(action, handler) : action;
  } catch (err) {
    if (err instanceof RetryableError) {
      // Nothing is recorded and the action doc stays put, so it runs again after the cool-down.
      return scheduleRetry(db.sentinel, action, err.message);
    }
    unexpected = err;
  }

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

  if (unexpected) {
    throw unexpected;
  }
};

/**
 * Works out what an operation has to do and writes it down. The action docs land before the log says
 * `running`, so an interrupted plan is always "queued with action docs" and can be told apart from a
 * finished operation, which is "running with none".
 */
const planOperation = async (log) => {
  let summary;
  let actions;
  try {
    // plan validates as it goes, so the operation is checked against the documents as they are now.
    ({ summary, actions } = await planners.plan(log.type, log.params));
  } catch (err) {
    if (err instanceof planners.ValidationError) {
      logger.warn(`bulk-operations: ${log._id} is no longer valid: ${err.message}`);
      return updateLog(log, { status: STATUSES.FAILED, error: { message: err.message } });
    }
    if (err instanceof RetryableError || isRetryableStatus(err)) {
      // Nothing was written, so the operation stays queued and is planned again later.
      return scheduleRetry(db.medicLogs, log, err.message);
    }
    throw err;
  }

  const actionDocs = actions
    .filter(({ operations }) => operations.length)
    .map(({ action, operations }) => buildActionDoc(log._id, action, operations));

  await writeActionDocs(actionDocs);

  const logActions = {};
  actionDocs.forEach(({ _id, action, total }) => {
    logActions[_id] = { action, total_changes_count: total, updated_date: new Date() };
  });
  // The cool-down belonged to the attempt that failed; the operation is under way now.
  await updateLog(log, {
    status: STATUSES.RUNNING, summary, actions: logActions, next_attempt_date: undefined,
  });
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
const runForAction = async (action, log) => {
  if (log?.status === STATUSES.RUNNING) {
    return runAction(action, log);
  }

  if (log?.status === STATUSES.QUEUED) {
    // An interrupted plan: nothing has run yet, so throw the actions away and plan again.
    await discardActionDocs(log._id);
    return planOperation(log);
  }

  // Terminal, or the log is gone entirely: these actions must not run.
  return discardActionDocs(action.bulk_operation_id);
};

/**
 * Asks the database what to do next, in a fixed order of preference, and does it. An outstanding
 * action always wins, so no new operation is planned while one is in flight.
 * @returns {Promise<boolean>} whether there was anything to do
 */
const runNext = async () => {
  const action = await getOldestActionDoc();
  if (action) {
    // Still cooling down after a failed attempt. Nothing else may be planned while it is
    // outstanding, so the pass ends here and wakes again when it is due.
    if (!isDue(action)) {
      waitFor(action);
      return false;
    }
    await runForAction(action, await getLog(action.bulk_operation_id));
    return true;
  }

  const log = await getNextLog();
  // The key comes from the view and the doc comes from `include_docs`, so an index that has not
  // caught up can hand back a log that has already finished. Each status says what to do, and a log
  // in any other state is left alone: planning a terminal operation would run it a second time.
  if (log?.status === STATUSES.RUNNING) {
    await finishOperation(log);
    return true;
  }

  if (log?.status === STATUSES.QUEUED) {
    // A plan that failed for a repeatable reason waits for its cool-down before trying again.
    if (!isDue(log)) {
      waitFor(log);
      return false;
    }
    await planOperation(log);
    return true;
  }

  return false;
};

let running = false;
let wakeRequested = false;
// When the only work left is cooling down, the pass records when to look again rather than spinning.
let waitingUntil = null;

const waitFor = (doc) => {
  const due = new Date(doc.next_attempt_date).getTime();
  waitingUntil = waitingUntil ? Math.min(waitingUntil, due) : due;
};

const runPass = async () => {
  running = true;
  try {
    do {
      wakeRequested = false;
      waitingUntil = null;
      while (await runNext()) {
        // keep going until there is nothing left
      }
      if (waitingUntil) {
        setTimeout(wake, Math.max(waitingUntil - Date.now(), 0));
      }
    } while (wakeRequested); // a change landed mid-pass: look again before going idle
  } catch (err) {
    logger.error(`bulk-operations: Error. Retrying in ${RETRY_TIMEOUT}ms. %o`, err);
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
