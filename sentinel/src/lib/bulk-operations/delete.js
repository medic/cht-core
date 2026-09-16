const logger = require('@medic/logger');
const db = require('../../db');

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

// Attachments are inlined so the copy is complete; conflicts are needed to delete every leaf.
const readForDelete = (ids) => db.medic.allDocs({
  keys: ids,
  include_docs: true,
  attachments: true,
  conflicts: true,
});

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
  const rejected = results.filter(({ error }) => error).map(({ id }) => id);
  if (rejected.length) {
    logger.error(`bulk-operations: delete could not copy some docs (action ${actionId}): %o`, results);
  }

  return { copied: docs.filter(doc => !rejected.includes(doc._id)), rejected };
};

/**
 * Deletes the docs and returns the ids that failed. A doc with conflicts contributes one entry per
 * leaf, so failures are collapsed back down by id.
 */
const tombstoneDocs = async (docs, actionId) => {
  const results = await db.medic.bulkDocs(docs.flatMap(buildTombstones));
  const errors = results.filter(res => res.error);
  if (errors.length) {
    logger.error(`bulk-operations: delete failed for some docs (action ${actionId}): %o`, errors);
  }
  return [ ...new Set(errors.map(res => res.id)) ];
};

/**
 * Copies the batch to the `medic-delete` database and then deletes it from `medic`.
 */
const deleteDocs = async (batch, actionId) => {
  const { ids, failed } = separateIds(batch, actionId);
  if (!ids.length) {
    return failed;
  }

  try {
    const result = await readForDelete(ids);
    // A row with no doc is already deleted or purged, so there is nothing left to do for it.
    const docs = result.rows.filter(row => row.doc).map(row => row.doc);
    if (!docs.length) {
      return failed;
    }

    const { copied, rejected } = await copyDocs(docs, actionId);
    rejected.forEach(id => failed.push({ id }));
    if (!copied.length) {
      return failed;
    }

    const failedIds = await tombstoneDocs(copied, actionId);
    failedIds.forEach(id => failed.push({ id }));
  } catch (err) {
    logger.error(`bulk-operations: delete failed (action ${actionId}): %o`, err);
    return batch;
  }

  return failed;
};

module.exports = { deleteDocs };
