const async = require('async');
const logger = require('@medic/logger');
const db = require('../db');
const config = require('../config');
const dataContext = require('../data-context');
const { PREFIXES } = require('@medic/constants');
const { ACTIONS, STATUSES, OPERATIONS_ATTACHMENT, ACTION_ID_PREFIX } = require('@medic/bulk-operations');
const userManagement = require('@medic/user-management')(config, db, dataContext);

const BATCH_SIZE = 100;
const RETRY_TIMEOUT = 60000;

// set-contact: point a place's `contact` reference at a new value (or clear it when `contact` is
// absent). The change is applied only if the doc still has the contact we recorded when the
// operation was queued, so a concurrent edit is not clobbered. Operations whose doc is gone or
// whose contact has since changed are returned as failed.
const setContact = async (batch) => {
  const result = await db.medic.allDocs({ keys: batch.map(op => op.id), include_docs: true });
  const docsById = {};
  result.rows.forEach(row => {
    if (row.doc) {
      docsById[row.doc._id] = row.doc;
    }
  });

  const failed = [];
  const toUpdate = [];
  batch.forEach(op => {
    const doc = docsById[op.id];
    const currentContactId = doc && (doc.contact?._id || doc.contact);
    if (!doc || currentContactId !== op.current_contact_id) {
      failed.push(op);
      return;
    }
    doc.contact = op.contact;
    toUpdate.push(doc);
  });

  if (toUpdate.length) {
    await db.medic.bulkDocs(toUpdate);
  }
  return failed;
};

// delete-user: remove each linked user through the existing user-delete path. Failures are
// collected per user so one bad delete does not abort the batch.
const deleteUser = async (batch) => {
  const failed = [];
  for (const op of batch) {
    try {
      await userManagement.deleteUser(op.id.replace(PREFIXES.COUCH_USER, ''));
    } catch (err) {
      logger.error(`bulk-operations: failed to delete user ${op.id}: %o`, err);
      failed.push(op);
    }
  }
  return failed;
};

const HANDLERS = {
  [ACTIONS.SET_CONTACT]: setContact,
  [ACTIONS.DELETE_USER]: deleteUser,
  // ACTIONS.ARCHIVE handler is added when #6615 lands.
};

const readOperations = async (actionId) => {
  const buffer = await db.sentinel.getAttachment(actionId, OPERATIONS_ATTACHMENT);
  return JSON.parse(buffer.toString());
};

// Persist progress on the action doc after each batch so a restart resumes from the cursor. The
// stored `operations` attachment is left as a stub, so advancing the cursor does not rewrite it.
const saveProgress = async (action, processedCount, failed) => {
  const latest = await db.sentinel.get(action._id);
  action._rev = latest._rev;
  action.cursor += processedCount;
  if (failed.length) {
    action.failed_operations = [ ...(action.failed_operations || []), ...failed ];
  }
  await db.sentinel.put(action);
};

const recordResultOnLog = async (action) => {
  const log = await db.medicLogs.get(action.bulk_operation_id);
  const failed = action.failed_operations || [];
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
  await db.sentinel.put({ ...action, _rev: latest._rev, _deleted: true });
};

// Processes a single bulk-operation action document: works through its operations in batches,
// advancing the cursor so a restart resumes where it left off, then records the outcome on the
// bulk operation log and removes the action document.
const processAction = async (action) => {
  const handler = HANDLERS[action.action];
  if (!handler) {
    throw new Error(`bulk-operations: no handler for action "${action.action}"`);
  }

  const operations = await readOperations(action._id);
  while (action.cursor < action.total) {
    const batch = operations.slice(action.cursor, action.cursor + BATCH_SIZE);
    if (!batch.length) {
      break;
    }
    const failed = await handler(batch);
    await saveProgress(action, batch.length, failed);
  }

  await recordResultOnLog(action);
  await deleteAction(action);
  logger.info(`bulk-operations: completed action ${action._id}`);
};

// --- the medic-sentinel changes-feed listener ---
// On startup we queue any action docs already waiting, then watch the feed for new ones. Actions
// are processed one at a time. `inProgress` stops our own cursor writes (which also show up on the
// feed) from re-queueing an action while it is still being processed.
const inProgress = new Set();

const queue = async.queue((action, callback) => {
  processAction(action)
    .catch(err => logger.error(`bulk-operations: error processing action ${action._id}: %o`, err))
    .then(() => callback());
});

const enqueue = (action) => {
  if (inProgress.has(action._id)) {
    return;
  }
  inProgress.add(action._id);
  queue.push(action, () => inProgress.delete(action._id));
};

const loadInitialQueue = async () => {
  const result = await db.sentinel.allDocs({
    startkey: ACTION_ID_PREFIX,
    endkey: `${ACTION_ID_PREFIX}￰`,
    include_docs: true,
  });
  result.rows.forEach(row => row.doc && enqueue(row.doc));
};

const registerFeed = () => {
  db.sentinel
    .changes({ live: true, since: 'now', include_docs: true })
    .on('change', (change) => {
      if (!change.deleted && change.id.startsWith(ACTION_ID_PREFIX) && change.doc) {
        enqueue(change.doc);
      }
    })
    .on('error', (err) => {
      logger.error('bulk-operations: changes feed error: %o', err);
      setTimeout(registerFeed, RETRY_TIMEOUT);
    });
};

const listen = async () => {
  logger.info('bulk-operations: listening for queued actions on medic-sentinel');
  await loadInitialQueue();
  registerFeed();
};

module.exports = {
  processAction,
  listen,
};
