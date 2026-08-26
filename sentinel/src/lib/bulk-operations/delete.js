const logger = require('@medic/logger');
const db = require('../../db');
const archiving = require('../archiving');

const separateIds = (batch, actionId) => {
  const ids = [];
  const failed = [];

  batch.forEach(op => {
    if (op.id) {
      ids.push(op.id);
    } else {
      logger.error(`bulk-operations: delete skipped an operation with no id (action ${actionId})`);
      failed.push(op);
    }
  });

  return { ids, failed };
};

// Every live leaf has to be deleted: deleting only the winning revision would promote a conflict and
// the doc would come back.
const buildTombstones = (doc) => [ doc._rev, ...(doc._conflicts || []) ]
  .map(rev => ({ _id: doc._id, _rev: rev, _deleted: true }));

// `_conflicts` is a query time field rather than part of the doc, so it is dropped from the copy.
const buildCopy = (doc, deletedDate) => {
  const copy = { ...doc, deleted_date: deletedDate };
  delete copy._conflicts;
  return copy;
};

/**
 * Groups the rows by what still has to happen to them. A row with no doc is either already deleted,
 * which is what a batch retried after Sentinel stopped before saving its cursor sees, or it never
 * existed at all.
 */
const sortRows = (rows) => {
  const docs = [];
  const deleted = [];
  const missing = [];

  rows.forEach(row => {
    if (row.doc) {
      docs.push(row.doc);
    } else if (row.value?.deleted) {
      deleted.push(row.key);
    } else {
      missing.push(row.key);
    }
  });

  return { docs, deleted, missing };
};

/**
 * Of the ids already deleted, those with no copy in the delete database. Our own retried batch always
 * left one behind, so anything missing was deleted by something else and nothing was kept, which is
 * not a success to report.
 */
const findUnretained = async (ids) => {
  if (!ids.length) {
    return [];
  }

  const result = await db.deleted.allDocs({ keys: ids });
  return result.rows.filter(row => row.error || row.value?.deleted).map(row => row.key);
};

// Attachments are inlined so the copy is complete; conflicts are needed to delete every leaf.
const readForDelete = (ids) => db.medic.allDocs({
  keys: ids,
  include_docs: true,
  attachments: true,
  conflicts: true,
});

// A row comes back live, already deleted, or missing. Only a live one still needs work.
const findLive = async (ids) => {
  if (!ids.length) {
    return [];
  }

  const result = await db.medic.allDocs({ keys: ids });
  return result.rows.filter(row => row.id && !row.value?.deleted).map(row => row.key);
};

/**
 * Copies the docs and returns only those the delete database accepted. bulkDocs resolves with an
 * error row rather than rejecting, so a doc whose copy failed has to be left alone: deleting it would
 * drop the body with nothing kept. With `new_edits: false` CouchDB reports only failures, so anything
 * that comes back is one.
 */
const copyDocs = async (docs, actionId) => {
  const deletedDate = Date.now();
  const results = await db.deleted.bulkDocs(docs.map(doc => buildCopy(doc, deletedDate)), {
    new_edits: false,
  });
  const rejected = new Set((results || []).filter(res => res.error).map(res => res.id));
  if (rejected.size) {
    logger.error(`bulk-operations: delete could not copy some docs (action ${actionId}): %o`, results);
  }

  return { copied: docs.filter(doc => !rejected.has(doc._id)), rejected: [ ...rejected ] };
};

/**
 * Deletes the docs and returns the ids that failed. A doc with conflicts contributes one entry per
 * leaf, so failures are collapsed back down by id.
 */
const tombstoneDocs = async (docs, actionId) => {
  const results = await db.medic.bulkDocs(docs.flatMap(buildTombstones));
  const errors = results.filter(res => res.error);
  if (!errors.length) {
    return new Set();
  }

  logger.error(`bulk-operations: delete failed for some docs (action ${actionId}): %o`, errors);
  return new Set(errors.map(res => res.id));
};

/**
 * One more pass over anything that is live again. A leaf that replicated in after the first snapshot
 * was never tombstoned, so CouchDB promotes it and the doc comes back, while the write we did report
 * no error at all. The retry is a full pass rather than another tombstone, so the revision we have
 * not seen before is copied before it is deleted and nothing is ever removed without its body being
 * kept. Bounded to one attempt: under continuous replication a loop might never finish.
 * @returns {Promise<string[]>} the ids still live afterwards, which have failed
 */
const retryLive = async (ids, actionId) => {
  const live = await findLive(ids);
  if (!live.length) {
    return [];
  }

  logger.warn(`bulk-operations: delete found ${live.length} doc(s) live again, retrying (action ${actionId})`);
  const result = await readForDelete(live);
  const docs = result.rows.map(row => row.doc).filter(Boolean);
  const { copied, rejected } = await copyDocs(docs, actionId);
  if (copied.length) {
    await tombstoneDocs(copied, actionId);
  }

  // A rejected copy fails whatever the doc looks like afterwards. We leave it alone, but if another
  // writer deletes that revision before the check below it would otherwise read as a clean success,
  // with the body never kept and the infodoc purged.
  return [ ...new Set([ ...rejected, ...await findLive(live) ]) ];
};

/**
 * Cleanup rather than the job itself, so a failure is logged and the batch still counts. Only the
 * docs that were actually deleted are purged: purging the infodoc of a doc that survived would throw
 * away its transition history, and Sentinel would treat a later edit as the first time it saw it.
 */
const purgeInfoDocs = async (docs, actionId) => {
  if (!docs.length) {
    return;
  }

  try {
    await archiving.purgeDocs(db.sentinel, docs.map(doc => `${doc._id}-info`));
  } catch (err) {
    logger.warn(`bulk-operations: delete could not purge the infodocs (action ${actionId}): %o`, err);
  }
};

/**
 * Copies the batch to the delete database and then deletes it from medic. Unlike archiving, the docs
 * are left as deleted revisions rather than purged, so the tombstone still reaches offline devices
 * and downstream stores such as cht-sync, which is what the forum discussion on #11349 settled on.
 *
 * The copy is written before the delete, so a crash in between leaves a doc that is copied and still
 * live, which re-running corrects. Doing it the other way round could lose the doc entirely.
 */
const deleteDocs = async (batch, actionId) => {
  const { ids, failed } = separateIds(batch, actionId);
  if (!ids.length) {
    return failed;
  }

  try {
    const result = await readForDelete(ids);
    const { docs, deleted, missing } = sortRows(result.rows);

    const unretained = await findUnretained(deleted);
    [ ...missing, ...unretained ].forEach(id => {
      logger.error(`bulk-operations: delete failed for ${id}: nothing to delete and no copy kept ` +
        `(action ${actionId})`);
      failed.push({ id });
    });

    if (!docs.length) {
      return failed;
    }

    // The copy keeps the original revision, so re-running is a no-op rather than a conflict.
    const { copied, rejected } = await copyDocs(docs, actionId);
    rejected.forEach(id => failed.push({ id }));
    if (!copied.length) {
      return failed;
    }

    const failedIds = await tombstoneDocs(copied, actionId);
    failedIds.forEach(id => failed.push({ id }));

    const tombstoned = copied.filter(doc => !failedIds.has(doc._id));
    const stillLive = new Set(await retryLive(tombstoned.map(doc => doc._id), actionId));
    stillLive.forEach(id => {
      logger.error(`bulk-operations: delete failed for ${id}: still live after the retry (action ${actionId})`);
      failed.push({ id });
    });

    await purgeInfoDocs(tombstoned.filter(doc => !stillLive.has(doc._id)), actionId);
  } catch (err) {
    logger.error(`bulk-operations: delete failed (action ${actionId}): %o`, err);
    return batch;
  }

  return failed;
};

module.exports = { deleteDocs };
