const logger = require('@medic/logger');
const db = require('../db');
const request = require('@medic/couch-request');
const constants = require('@medic/constants');
const environment = require('@medic/environment');
const audit = require('@medic/audit');
const archivingUtils = require('@medic/archiving-utils');

const BATCH_SIZE = 1000;

let currentlyArchiving = false;

const fetchNextJob = async () => {
  const result = await db.sentinel.allDocs({
    startkey: constants.PREFIXES.ARCHIVE_JOB,
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

  const medicDocs = await db.medic.allDocs({ attachments: true, keys: ids, include_docs: true, conflicts: true });

  const docsToArchive = medicDocs.rows
    .filter(row => canArchive(row.doc))
    .map(row => ({ ...row.doc, archive_date: date }));
  await db.archive.bulkDocs(docsToArchive, { new_edits: false });

  await db.purge(db.medic, docsToArchive);

  await purgeInfoDocs(docsToArchive);
  await persistAudit(docsToArchive, date);
};

const purgeInfoDocs = async (docsToArchive) => {
  const infoDocIds = docsToArchive.map(doc => `${doc._id}-info`);
  const infoDocs = await db.sentinel.allDocs({ keys: infoDocIds, include_docs: true, conflicts: true });

  await db.purge(db.sentinel, infoDocs.rows.map(row => row.doc));
};

const persistAudit = async (docsToArchive, date) => {
  const ids = docsToArchive.map(doc => doc._id);
  await audit.recordArchiving(ids, date);
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
    await db.sentinel.put(job);
  } catch (writeErr) {
    logger.error(`Archiving: could not record error on job ${job._id}: %o`, writeErr);
  }
};

const processJob = async (job, deadline) => {
  logger.info(`Archiving: processing job ${job._id} (${job.cursor}/${job.total})`);

  try {
    const ids = await readIds(job);
    let batches = 0;

    while (job.cursor < job.total && Date.now() < deadline) {
      const batch = ids.slice(job.cursor, job.cursor + BATCH_SIZE);
      await archiveBatch(batch);
      await saveJob(job, batch.length);
      if (++batches % 10 === 0) {
        await indexViews();
      }
    }
  } catch (err) {
    await recordError(job, err);
    throw err;
  }
};

const archive = async ({ duration } = {}) => {
  if (currentlyArchiving) {
    return;
  }
  logger.info('Running archiving');
  currentlyArchiving = true;
  const deadline = duration ? Date.now() + duration : Infinity;

  try {
    while (Date.now() < deadline) {
      const job = await fetchNextJob();
      if (!job) {
        break;
      }
      await processJob(job, deadline);
    }
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
