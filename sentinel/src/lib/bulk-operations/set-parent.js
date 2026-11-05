const logger = require('@medic/logger');
const db = require('../../db');

// Point a contact at a new parent lineage, only when the doc still holds the parent we recorded, so a
// concurrent edit is not clobbered. A missing id/doc or a changed parent is failed.
const setParent = async (batch, actionId) => {
  const withId = batch.filter(op => op.id);
  const result = withId.length
    ? await db.medic.allDocs({ keys: withId.map(op => op.id), include_docs: true })
    : { rows: [] };
  const docsById = {};
  result.rows.forEach(row => {
    if (row.doc) {
      docsById[row.doc._id] = row.doc;
    }
  });

  const failed = [];
  const toUpdate = [];
  batch.forEach(op => {
    if (!op.id) {
      logger.error(`bulk-operations: set-parent skipped an operation with no id (action ${actionId})`);
      failed.push(op);
      return;
    }
    const doc = docsById[op.id];
    if (!doc) {
      logger.error(`bulk-operations: set-parent failed for ${op.id}: doc missing (action ${actionId})`);
      failed.push(op);
      return;
    }
    const currentParentId = doc.parent?._id || doc.parent;
    if (currentParentId !== op.current_parent_id) {
      logger.error(`bulk-operations: set-parent failed for ${op.id}: parent changed (action ${actionId})`);
      failed.push(op);
      return;
    }
    doc.parent = op.parent;
    toUpdate.push(doc);
  });

  if (toUpdate.length) {
    // bulkDocs does not reject when an individual doc fails, so check each result.
    const results = await db.medic.bulkDocs(toUpdate);
    results.forEach((res, i) => {
      if (res.error) {
        logger.error(`bulk-operations: set-parent failed for ${toUpdate[i]._id}: %o (action ${actionId})`, res);
        failed.push(batch.find(op => op.id === toUpdate[i]._id));
      }
    });
  }
  return failed;
};

module.exports = { setParent };
