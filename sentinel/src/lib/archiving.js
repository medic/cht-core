const logger = require('@medic/logger');
const db = require('../db');
const request = require('@medic/couch-request');
const constants = require('@medic/constants');
const environment = require('@medic/environment');
const audit = require('@medic/audit');
const archivingUtils = require('@medic/archiving-utils');
const contactTypesUtils = require('@medic/contact-types-utils');

const BATCH_SIZE = 1000;
// Docs are fetched with inlined attachments, so cap the number of docs per response
const FETCH_BATCH_SIZE = 100;
const MAX_JOB_ATTEMPTS = 20;
const FAILED_STATUS = 'failed';

let currentlyArchiving = false;

const fetchNextJob = async (startkey = constants.PREFIXES.ARCHIVE_JOB) => {
  const result = await db.sentinel.allDocs({
    startkey,
    endkey: `${constants.PREFIXES.ARCHIVE_JOB}\ufff0`,
    include_docs: true,
    limit: 1,
  });
  return result.rows[0]?.doc;
};

const readIds = async (job) => {
  const buffer = await db.sentinel.getAttachment(job._id, archivingUtils.ATTACHMENT_NAME);
  return archivingUtils.decodeIds(buffer);
};

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

const archiveBatch = async (batch) => {
  const ids = batch.map(i => i.toString().trim()).filter(Boolean);
  if (!ids.length) {
    return;
  }
  const date = Date.now();

  const archivedIds = [];
  // fetch and write chunk by chunk — attachments are inlined, so both payloads need bounding
  for (let i = 0; i < ids.length; i += FETCH_BATCH_SIZE) {
    const chunk = ids.slice(i, i + FETCH_BATCH_SIZE);
    const medicDocs = await db.medic.allDocs({ attachments: true, keys: chunk, include_docs: true });
    const docsToArchive = medicDocs.rows
      .filter(row => canArchive(row.doc))
      .map(row => ({ ...row.doc, archive_date: date }));
    if (!docsToArchive.length) {
      continue;
    }
    await db.archive.bulkDocs(docsToArchive, { new_edits: false });
    archivedIds.push(...docsToArchive.map(doc => doc._id));
  }

  await audit.recordArchiving(archivedIds, date);
  await purgeDocs(db.sentinel, archivedIds.map(id => `${id}-info`));
  await purgeDocs(db.medic, archivedIds);
};

// Purges every leaf revision — the winner, live conflicts and deleted conflict leaves
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

const MAX_ERRORS_KEPT = 5;

const saveJob = async (job, batchSize) => {
  const latest = await db.sentinel.get(job._id);
  job._rev = latest._rev;
  job.cursor += batchSize;
  job.history = job.history || [];
  job.history.push({ date: Date.now(), cursor: job.cursor });
  if (job.cursor >= job.total) {
    job._deleted = true;
  }
  await db.sentinel.put(job);
};


const recordError = async (job, err) => {
  try {
    const latest = await db.sentinel.get(job._id);
    job._rev = latest._rev;
    job.error_count = (job.error_count || 0) + 1;
    job.errors = job.errors || [];
    job.errors.push({ date: Date.now(), message: err?.message || err?.stack || err });
    if (job.errors.length > MAX_ERRORS_KEPT) {
      job.errors = job.errors.slice(-MAX_ERRORS_KEPT);
    }
    if (job.error_count >= MAX_JOB_ATTEMPTS) {
      job.status = FAILED_STATUS;
      logger.error(`Archiving: job ${job._id} failed ${job.error_count} times, quarantining it`);
    }
    await db.sentinel.put(job);
  } catch (writeErr) {
    logger.error(`Archiving: could not record error on job ${job._id}: %o`, writeErr);
  }
};

const processJob = async (job, deadline) => {
  logger.info(`Archiving: processing job ${job._id} (${job.cursor}/${job.total})`);

  try {
    const ids = await readIds(job);
    if (ids.length !== job.total) {
      job.total = ids.length;
    }
    let batches = 0;

    do {
      const batch = ids.slice(job.cursor, job.cursor + BATCH_SIZE);
      await archiveBatch(batch);
      await saveJob(job, batch.length);
      if (++batches % 10 === 0) {
        await indexViews();
      }
    } while (job.cursor < job.total && Date.now() < deadline);
  } catch (err) {
    await recordError(job, err);
    logger.error(`Archiving: job ${job._id} failed, skipping to the next job: %o`, err);
  }
};

const processQueue = async (deadline) => {
  let startkey = constants.PREFIXES.ARCHIVE_JOB;
  do {
    const job = await fetchNextJob(startkey);
    if (!job) {
      break;
    }
    startkey = `${job._id}￰`;
    if (job.status === FAILED_STATUS) {
      continue;
    }
    await processJob(job, deadline);
  } while (Date.now() < deadline);
};

const archive = async ({ duration } = {}) => {
  if (currentlyArchiving) {
    return;
  }
  logger.info('Running archiving');
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
