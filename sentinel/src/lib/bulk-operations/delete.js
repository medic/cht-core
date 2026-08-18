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
    const docs = result.rows.map(row => row.doc).filter(Boolean);

    const found = new Set(docs.map(doc => doc._id));
    ids
      .filter(id => !found.has(id))
      .forEach(id => {
        logger.error(`bulk-operations: delete failed for ${id}: doc missing (action ${actionId})`);
        failed.push({ id });
      });

    if (!docs.length) {
      return failed;
    }

    const deletedDate = Date.now();
    // new_edits: false keeps the original revision, so the copy matches what medic held and a
    // re-run is a no-op rather than a conflict.
    await db.deleted.bulkDocs(docs.map(doc => buildCopy(doc, deletedDate)), { new_edits: false });
    // Sentinel's background cleanup would eventually delete these, but purging now keeps the
    // infodocs from outliving the batch.
    await archiving.purgeDocs(db.sentinel, docs.map(doc => `${doc._id}-info`));

    // bulkDocs does not reject when an individual doc fails, so check each result. A doc with
    // conflicts contributes one entry per leaf, so failures are collapsed back down by id.
    const results = await db.medic.bulkDocs(docs.flatMap(buildTombstones));
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
