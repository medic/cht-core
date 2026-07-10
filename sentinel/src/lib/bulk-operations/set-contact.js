const logger = require('@medic/logger');
const db = require('../../db');

// Point a place's contact at a new value (or clear it), only when the doc still holds the contact we
// recorded, so a concurrent edit is not clobbered. A missing id/doc or a changed contact is failed.
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
    await db.medic.bulkDocs(toUpdate);
  }
  return failed;
};

module.exports = setContact;
