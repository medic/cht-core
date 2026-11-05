const moment = require('moment');
const logger = require('@medic/logger');
const db = require('../db');
const request = require('@medic/couch-request');
const constants = require('@medic/constants');
const environment = require('@medic/environment');
const audit = require('@medic/audit');
const contactTypesUtils = require('@medic/contact-types-utils');
const { v7: uuid } = require('uuid');

const PURGE_BATCH_SIZE = 1000;
const FETCH_BATCH_SIZE = 100;
const MAX_JOB_ATTEMPTS = 10;
const JOB_LOG_STATUS = {
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
};

// How long terminal tasks and old targets are kept. Purging hides them from offline users and
// archiving removes them from medic, so both features read the same boundary from here: a
// change to one that silently left the other behind would archive docs clients still hold.
const TASK_EXPIRATION_PERIOD = 60; // days
const TARGET_EXPIRATION_PERIOD = 6; // months

/**
 * The newest `emission.endDate` an expired task can carry, keyed as `medic/tasks_in_terminal_state`
 * emits it.
 * @returns {string} YYYY-MM-DD
 */
const getMaximumEmissionEndDate = () => moment()
  .subtract(TASK_EXPIRATION_PERIOD, 'days')
  .format('YYYY-MM-DD');

/**
 * The newest reporting interval tag an expired target can carry, as target doc ids embed it.
 * @returns {string} YYYY-MM
 */
const getLastAllowedReportingIntervalTag = () => moment()
  .subtract(TARGET_EXPIRATION_PERIOD, 'months')
  .format('YYYY-MM');

// caps the ids in one automatic job, and so the size of each sweep query response
const AUTO_ARCHIVE_JOB_SIZE = 50 * 1000;

let currentlyArchiving = false;

/**
 * Whether every id in the job has been processed.
 * @param {Object} [job] - the archive job doc
 * @returns {boolean}
 */
const jobFinished = (job) => job && job.cursor >= job.total;

/**
 * Returns the first queued archive job doc with an _id after startkey, or the first job in the
 * queue when startkey is omitted. Job ids are uuid-v7 suffixed, so _id order is creation order.
 * Once the queue is drained, persists and returns a new automatic job for expired tasks and
 * targets instead, see fetchAutoArchiveJob.
 * @param {string} [startkey] - _id of the last job processed in this run
 * @returns {Promise<Object|undefined>} the job doc, or undefined when there is nothing to archive
 */
const fetchNextJob = async (startkey) => {
  startkey = startkey ? `${startkey}\ufff0` : constants.PREFIXES.ARCHIVE_JOB;
  const result = await db.sentinel.allDocs({
    startkey,
    endkey: `${constants.PREFIXES.ARCHIVE_JOB}\ufff0`,
    include_docs: true,
    limit: 1,
  });

  if (result.rows[0]?.doc) {
    return result.rows[0]?.doc;
  }

  return fetchAutoArchiveJob();
};

/**
 * Reads the full list of doc ids stored in the job's attachment.
 * @param {Object} job - the archive job doc
 * @returns {Promise<string[]>}
 */
const readIds = async (job) => {
  const buffer = await db.sentinel.getAttachment(job._id, constants.ARCHIVE_IDS_ATTACHMENT);
  return buffer.toString('utf8').split('\n');
};

/**
 * Whether the doc is of an archivable type. Anything else (design docs, forms, settings, ...)
 * is silently skipped.
 * @param {Object} doc
 * @returns {boolean}
 */
const canArchive = (doc) => {
  const archivableDocTypes = [
    'contact',
    ...contactTypesUtils.HARDCODED_TYPES,
    constants.DOC_TYPES.DATA_RECORD,
    'task',
    'target',
  ];
  return archivableDocTypes.includes(doc?.type);
};

/**
 * Archives one batch of doc ids: copies archivable docs (with attachments) to the archive db,
 * records an audit entry, then purges the docs and their info docs. Execution is ordered so that a crash at
 * any point is recoverable by re-running the batch. Ids that are missing or not archivable are
 * skipped and logged.
 * @param {string[]} batch - doc ids to archive
 * @returns {Promise<void>}
 */
const archiveBatch = async (batch) => {
  const ids = batch.map(i => i.toString().trim()).filter(Boolean);
  if (!ids.length) {
    return;
  }
  const date = Date.now();

  const archivedIds = [];
  const skippedIds = [];
  // fetch and write chunk by chunk — attachments are inlined, so both payloads need bounding
  while (ids.length) {
    const chunk = ids.splice(0, FETCH_BATCH_SIZE);
    const medicDocs = await db.medic.allDocs({ attachments: true, keys: chunk, include_docs: true });
    const docsToArchive = medicDocs.rows
      .filter(row => canArchive(row.doc))
      .map(row => ({ ...row.doc, archive_date: date }));
    const archivable = new Set(docsToArchive.map(doc => doc._id));
    skippedIds.push(...chunk.filter(id => !archivable.has(id)));
    if (!docsToArchive.length) {
      continue;
    }
    await db.archive.bulkDocs(docsToArchive, { new_edits: false });
    archivedIds.push(...archivable);
  }

  if (skippedIds.length) {
    logger.warn(`Archiving: skipped ${skippedIds.length} ids, missing or not archivable: %o`, skippedIds);
  }

  await audit.recordArchiving(archivedIds, date);
  await purgeDocs(db.sentinel, archivedIds.map(id => `${id}-info`));
  await purgeDocs(db.medic, archivedIds);
};

/**
 * Purges every leaf revision — the winner, live conflicts and deleted conflict leaves (which
 * _bulk_get returns when called without revs) — so purged docs leave no trace in the changes feed.
 * @param {PouchDB.Database} database
 * @param {string[]} ids
 * @returns {Promise<void>}
 */
const purgeDocs = async (database, ids) => {
  if (!ids.length) {
    return;
  }
  const result = await database.bulkGet({ docs: ids.map(id => ({ id })) });
  const toPurge = result.results
    .map(({ id, docs }) => ({
      _id: id,
      _revs: docs.map(leaf => leaf.ok?._rev).filter(Boolean),
    }))
    .filter(doc => doc._revs.length);
  if (!toPurge.length) {
    return;
  }
  await db.purge(database, toPurge);
};

/**
 * Queries one view from every critical ddoc so their indexes keep up with the
 * purges. Indexing is required, as archiving must not outpace the indexers. 
 * @returns {Promise<void>}
 */
const indexViews = async () => {
  await Promise.all([
    db.medic.query('medic/contacts_by_depth', { limit: 1 }),
    db.medic.query('medic-client/contacts_by_last_visited', { limit: 1 }),
    request.get({
      url: `${environment.couchUrl}/_design/medic/_nouveau/docs_by_replication_key`,
      qs: { limit: 1, q: '*:*' }
    })
  ]);
};

/**
 * Returns the job's log doc from medic-logs, or a fresh one on the first write. The log doc
 * shares the job's _id and outlives it: it is the durable record of the job's lifecycle
 * (status, progress, errors) after the queue doc is deleted.
 * @param {string} jobId
 * @returns {Promise<Object>}
 */
const getLog = async (jobId) => {
  try {
    return await db.medicLogs.get(jobId);
  } catch (err) {
    if (err.status !== 404) {
      throw err;
    }
    return {
      _id: jobId,
      start_date: Date.now(),
      status: JOB_LOG_STATUS.RUNNING,
      errors: [],
    };
  }
};

/**
 * Applies the given field changes to the job's log doc and saves it, stamping updated_date.
 * Never throws — log docs are best-effort history and must not fail the job.
 * @param {string} jobId
 * @param {Object} changes - fields to set on the log doc
 * @returns {Promise<void>}
 */
const updateLog = async (jobId, changes) => {
  try {
    const log = await getLog(jobId);
    Object.assign(log, changes, { updated_date: Date.now() });
    await db.medicLogs.put(log);
  } catch (err) {
    logger.error(`Archiving: could not update the log for job ${jobId}: %o`, err);
  }
};

/**
 * Marks the job's log as running, syncing its cursor and total and flagging automatic jobs.
 * @param {Object} job - the archive job doc
 * @returns {Promise<void>}
 */
const setLogRunning = (job) => updateLog(job._id, {
  status: JOB_LOG_STATUS.RUNNING,
  cursor: job.cursor,
  total: job.total,
  ...(job.automatic && { automatic: true }),
});

/**
 * Advances the log's cursor, flipping the status to completed once the job is done.
 * @param {Object} job - the archive job doc
 * @returns {Promise<void>}
 */
const updateLogCursor = (job) => updateLog(job._id, {
  cursor: job.cursor,
  status: jobFinished(job) ? JOB_LOG_STATUS.COMPLETED : JOB_LOG_STATUS.RUNNING,
});

/**
 * Appends an error entry to the job's log, keeping only the last MAX_JOB_ATTEMPTS entries, and
 * applies any additional field changes in the same write.
 * Never throws — log docs are best-effort history and must not fail the job.
 * @param {string} jobId
 * @param {string|*} message - the failure message (or raw error value)
 * @param {Object} [changes] - extra fields to set on the log doc
 * @returns {Promise<void>}
 */
const addLogError = async (jobId, message, changes = {}) => {
  try {
    const log = await getLog(jobId);
    log.errors = [...(log.errors || []), { date: Date.now(), message }].slice(-MAX_JOB_ATTEMPTS);
    Object.assign(log, changes, { updated_date: Date.now() });
    await db.medicLogs.put(log);
  } catch (err) {
    logger.error(`Archiving: could not update the log for job ${jobId}: %o`, err);
  }
};

/**
 * Advances the job's cursor by batchSize and appends a history entry. Deletes the job doc once
 * the cursor reaches the total, or once the job has exhausted its MAX_JOB_ATTEMPTS —
 * a permanently failed job never blocks the queue, its record lives on in medic-logs.
 * @param {Object} job - the archive job doc
 * @param {number} batchSize - number of ids consumed by the batch that just completed
 * @returns {Promise<void>}
 */
const saveJob = async (job, batchSize) => {
  const latest = await db.sentinel.get(job._id);
  job._rev = latest._rev;
  job.cursor += batchSize;
  job.history = job.history || [];
  job.history.push({ date: Date.now(), cursor: job.cursor });
  if (jobFinished(job) || job.error_count >= MAX_JOB_ATTEMPTS) {
    job._deleted = true;
  }
  await db.sentinel.put(job);
};


/**
 * Records a failure: bumps error_count on the job doc and appends the error to the job's log
 * doc (last MAX_JOB_ATTEMPTS entries kept). Once error_count reaches MAX_JOB_ATTEMPTS the log
 * is marked failed and saveJob deletes the job doc.
 * Never throws — a failure to record is only logged.
 * @param {Object} job - the archive job doc
 * @param {Error|*} err - the error that failed the job
 * @returns {Promise<void>}
 */
const recordError = async (job, err) => {
  try {
    job.error_count = (job.error_count || 0) + 1;
    const failed = job.error_count >= MAX_JOB_ATTEMPTS;
    const changes = failed ? { status: JOB_LOG_STATUS.FAILED } : {};
    await addLogError(job._id, err?.message || err?.stack || err, changes);

    if (failed) {
      logger.error(`Archiving: job ${job._id} failed ${job.error_count} times, giving up`);
    }
    await saveJob(job, 0);
  } catch (writeErr) {
    logger.error(`Archiving: could not record error on job ${job._id}: %o`, writeErr);
  }
};

/**
 * Works through a job's ids in PURGE_BATCH_SIZE batches, resuming from the stored cursor and
 * stopping at the deadline time. Progress and errors are mirrored to the job's medic-logs doc;
 * errors are swallowed so the queue moves on, and the errored job is retried on the next run.
 * @param {Object} job - the archive job doc
 * @param {number} deadline - epoch ms after which no further batch is started
 * @param {{ batches: number }} indexCounter - run-wide batch counter deciding when to warm
 *   indexes; shared across jobs so many small jobs warm them as reliably as one large job
 * @returns {Promise<void>}
 */
const processJob = async (job, deadline, indexCounter) => {
  logger.info(`Archiving: processing job ${job._id} (${job.cursor}/${job.total})`);

  try {
    const ids = await readIds(job);
    job.total = ids.length; // account for possible doc tampering
    await setLogRunning(job);

    do {
      const batch = ids.slice(job.cursor, job.cursor + PURGE_BATCH_SIZE);
      await archiveBatch(batch);
      await saveJob(job, batch.length);
      await updateLogCursor(job);
      if (++indexCounter.batches % 10 === 0) {
        await indexViews();
      }
    } while (!jobFinished(job) && Date.now() < deadline);
  } catch (err) {
    await recordError(job, err);
    logger.error(`Archiving: job ${job._id} failed, skipping to the next job: %o`, err);
  }
};

/**
 * Builds a new archive job _id. The uuid-v7 suffix keeps _id order equal to creation order.
 * @returns {string}
 */
const buildJobId = () => `${constants.PREFIXES.ARCHIVE_JOB}${uuid()}`;

/**
 * Saves one automatic archive job doc to the sentinel db, carrying the ids as an attachment.
 * @param {string[]} ids - doc ids for this job
 * @returns {Promise<Object>} the saved job doc
 */
const persistJob = async (ids) => {
  const doc = {
    _id: buildJobId(),
    date: Date.now(),
    total: ids.length,
    cursor: 0,
    automatic: true,
    _attachments: {
      [constants.ARCHIVE_IDS_ATTACHMENT]: {
        content_type: 'text/plain',
        data: Buffer.from(ids.join('\n'), 'utf8'),
      },
    },
  };

  await db.sentinel.put(doc);
  return doc;
};

/**
 * Queues an automatic job for up to 50k expired ids, oldest first. Expired
 * tasks take precedence: targets are only read when the tasks don't fill the job.
 * @returns {Promise<Object|undefined>} the saved job doc, or undefined when nothing has expired
 */
const fetchAutoArchiveJob = async () => {
  let ids = await fetchTasks();
  if (ids.length < AUTO_ARCHIVE_JOB_SIZE) {
    const targetIds = await fetchTargets();
    ids.push(...targetIds);
  }

  if (!ids.length) {
    return;
  }

  ids = ids.slice(0, AUTO_ARCHIVE_JOB_SIZE);
  return await persistJob(ids);
};

/**
 * Returns the ids of the oldest tasks in a terminal state whose `emission.endDate` has expired.
 * The empty start key floors the range above `null` and numeric keys, so tasks with a malformed
 * `emission.endDate` are skipped rather than archived regardless of age.
 * @returns {Promise<string[]>} up to AUTO_ARCHIVE_JOB_SIZE task ids
 */
const fetchTasks = async () => {
  const { rows } = await db.medic.query('medic/tasks_in_terminal_state', {
    limit: AUTO_ARCHIVE_JOB_SIZE,
    start_key: '',
    end_key: getMaximumEmissionEndDate(),
  });
  return rows.map(row => row.id);
};

/**
 * Returns the ids of the oldest targets whose reporting interval has expired. Target ids embed
 * their reporting interval tag, so an _id range selects them without a view.
 * @returns {Promise<string[]>} up to AUTO_ARCHIVE_JOB_SIZE target ids
 */
const fetchTargets = async () => {
  const { rows } = await db.medic.allDocs({
    limit: AUTO_ARCHIVE_JOB_SIZE,
    start_key: 'target~',
    end_key: `target~${getLastAllowedReportingIntervalTag()}~`,
  });
  return rows.map(row => row.id);
};

/**
 * Processes archive jobs one at a time until the deadline or until nothing is left to archive:
 * queued jobs first, in _id order, then one automatic job for expired tasks and targets, created
 * once the queue drains. That job ends the run, finished or not, so a run sweeps at most once and
 * a failed sweep is never queued again over the same ids. Queued jobs, automatic ones left over
 * from earlier runs included, never end the run early. Jobs created in this run are told apart by
 * their missing _rev, as persistJob doesn't write it back. Permanently failed jobs are deleted by
 * recordError, so everything in the queue is processable.
 * @param {number} deadline - epoch ms after which no further job is started
 * @returns {Promise<void>}
 */
const processQueue = async (deadline) => {
  let startkey;
  let freshAutoArchiveJob;
  const indexCounter = { batches: 0 };
  do {
    const job = await fetchNextJob(startkey);
    if (!job) {
      break;
    }
    startkey = job._id;
    freshAutoArchiveJob = !job._rev;
    await processJob(job, deadline, indexCounter);
  } while (Date.now() < deadline && !freshAutoArchiveJob);
};

/**
 * Runs archiving: processes queued archive jobs, then archives expired tasks and targets,
 * optionally bounded to a maximum duration. A no-op when a run is already in flight. Never throws.
 * @param {number} [duration] - maximum run time in ms; unbounded when omitted
 * @returns {Promise<void>}
 */
const archive = async (duration) => {
  if (currentlyArchiving) {
    return;
  }
  const runtime = duration ? `for up to ${moment.duration(duration).humanize()}` : 'until the queue is drained';
  logger.info(`Running archiving ${runtime}`);
  currentlyArchiving = true;
  const deadline = duration ? Date.now() + duration : Infinity;

  try {
    await processQueue(deadline);
  } catch (err) {
    logger.error('Error while running archive: %o', err);
  } finally {
    logger.info('Finished archiving');
    currentlyArchiving = false;
  }
};

module.exports = {
  archive,
};
