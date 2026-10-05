const _ = require('lodash');
const logger = require('@medic/logger');
const db = require('../../db');
const { writeDocs } = require('./write');

// Delete clears the reference and move rewrites it, so "already applied" has to count two absent
// values as equal: a cleared contact can come back as undefined or as null.
const isAlreadyApplied = (current, wanted) => (!current && !wanted) || _.isEqual(current, wanted);

/**
 * Point a place's contact at a new value (or clear it), only when the doc still holds the contact we
 * recorded, so a concurrent edit is not clobbered. A doc that already holds the value we are writing
 * is left alone: a re-run has to converge rather than report the guard as a mismatch.
 */
const setContact = async (batch, actionId) => {
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
      logger.error(`bulk-operations: set-contact skipped an operation with no id (action ${actionId})`);
      failed.push(op);
      return;
    }
    const doc = docsById[op.id];
    if (!doc) {
      logger.error(`bulk-operations: set-contact failed for ${op.id}: doc missing (action ${actionId})`);
      failed.push(op);
      return;
    }
    if (isAlreadyApplied(doc.contact, op.contact)) {
      // Already applied, by us on an earlier attempt or by someone else: nothing left to do.
      return;
    }
    const currentContactId = doc.contact?._id || doc.contact;
    if (currentContactId !== op.current_contact_id) {
      logger.error(`bulk-operations: set-contact failed for ${op.id}: contact changed (action ${actionId})`);
      failed.push(op);
      return;
    }
    doc.contact = op.contact;
    toUpdate.push(doc);
  });

  if (toUpdate.length) {
    const errors = await writeDocs(db.medic, toUpdate, `bulk-operations: set-contact (action ${actionId})`);
    errors.forEach(({ id }) => {
      logger.error(`bulk-operations: set-contact failed for ${id}: (action ${actionId})`);
      failed.push(batch.find(op => op.id === id));
    });
  }
  return failed;
};

module.exports = { setContact };
