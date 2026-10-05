const _ = require('lodash');
const logger = require('@medic/logger');
const db = require('../../db');
const { writeDocs } = require('./write');

/**
 * Point a contact at a new parent lineage, only when the doc still holds the parent we recorded, so
 * a concurrent edit is not clobbered. A doc that already holds the lineage we are writing is left
 * alone: a re-run has to converge rather than report the guard as a mismatch.
 */
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
    if (_.isEqual(doc.parent, op.parent)) {
      // Already applied, by us on an earlier attempt or by someone else: nothing left to do.
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
    const errors = await writeDocs(db.medic, toUpdate, `bulk-operations: set-parent (action ${actionId})`);
    errors.forEach(({ id }) => {
      logger.error(`bulk-operations: set-parent failed for ${id}: (action ${actionId})`);
      failed.push(batch.find(op => op.id === id));
    });
  }
  return failed;
};

module.exports = { setParent };
