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
 * Splits the rows into the docs still to delete and the ids that failed. A row with no doc is either
 * already deleted, which is what a retried batch sees after Sentinel stopped before saving its
 * cursor, and counts as done, or it never existed at all, which fails.
 */
const sortRows = (rows, failed, actionId) => {
  const docs = [];

  rows.forEach(row => {
    if (row.doc) {
      docs.push(row.doc);
    } else if (row.value?.deleted) {
      logger.info(`bulk-operations: delete skipped ${row.key}, already deleted (action ${actionId})`);
    } else {
      logger.error(`bulk-operations: delete failed for ${row.key}: doc missing (action ${actionId})`);
      failed.push({ id: row.key });
    }
  });

  return docs;
};

/**
 * Copies the docs and returns only those the delete database accepted. bulkDocs resolves with an
 * error row rather than rejecting, so a doc whose copy failed has to be left alone: deleting it
 * would drop the body with nothing kept. With `new_edits: false` CouchDB reports only failures, so
 * anything that comes back is one.
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

// Cleanup rather than the job itself: background cleanup removes any infodoc left behind by a
// deletion, so a failure here must not stop the docs being deleted.
const purgeInfoDocs = async (docs, actionId) => {
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
    // Attachments are inlined so the copy is complete; conflicts are needed to delete every leaf.
    const result = await db.medic.allDocs({
      keys: ids,
      include_docs: true,
      attachments: true,
      conflicts: true,
    });
    const docs = sortRows(result.rows, failed, actionId);
    if (!docs.length) {
      return failed;
    }

    // The copy keeps the original revision, so re-running is a no-op rather than a conflict.
    const { copied, rejected } = await copyDocs(docs, actionId);
    rejected.forEach(id => failed.push({ id }));
    if (!copied.length) {
      return failed;
    }

    await purgeInfoDocs(copied, actionId);

    // bulkDocs does not reject when an individual doc fails, so check each result. A doc with
    // conflicts contributes one entry per leaf, so failures are collapsed back down by id.
    const results = await db.medic.bulkDocs(copied.flatMap(buildTombstones));
    const errors = results.filter(res => res.error);
    if (errors.length) {
      logger.error(`bulk-operations: delete failed for some docs (action ${actionId}): %o`, errors);
      [ ...new Set(errors.map(res => res.id)) ].forEach(id => failed.push({ id }));
    }
  } catch (err) {
    logger.error(`bulk-operations: delete failed (action ${actionId}): %o`, err);
    return batch;
  }

  return failed;
};

module.exports = { deleteDocs };
