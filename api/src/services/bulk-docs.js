const db = require('../db-pouch');

const utils = require('bulk-docs-utils')({
  Promise: Promise,
  DB: db.medic
});

const markAsDeleted = data => {
  return data.rows
    .map(row => {
      const doc = row.doc;
      if (doc) {
        doc._deleted = true;
        return doc;
      }
    })
    .filter(doc => doc);
};

const checkForDuplicates = docs => {
  const duplicateErrors = utils.getDuplicateErrors(docs);
  if (duplicateErrors.length > 0) {
    console.error('Deletion errors', duplicateErrors);
    const ids = duplicateErrors.map(error => error.id);
    throw new Error(`Duplicate documents when deleting: ${ids.join(',')}`);
  }
};

const generateBatches = (docs, batchSize) => {
  const batches = [];
  while (docs.length > 0) {
    const batch = docs.splice(0, batchSize);
    batches.push(batch);
  }
  return batches;
};

const generateBatchPromise = (batch, res, { isFinal } = {}) => {
  return db.medic.bulkDocs(batch).then(result => {
    let resString = JSON.stringify(result);
    resString += isFinal ? '' : ',';
    res.write(resString);
  });
};

module.exports = {
  bulkDelete: (docs, res, { batchSize = 100 } = {}) => {
    let docsToDelete;
    const keys = docs.map(doc => doc._id);
    return db.medic.allDocs({ keys, include_docs: true })
      .then(result => {
        docsToDelete = markAsDeleted(result);
        return utils.updateParentContacts(docsToDelete);
      })
      .then(docsToUpdate => {
        const allDocs = docsToDelete.concat(docsToUpdate);
        checkForDuplicates(allDocs);
        const batches = generateBatches(allDocs, batchSize);

        res.type('application/json');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.write('[');

        return batches.reduce((promise, batch, index) => {
          return promise.then(() => generateBatchPromise(batch, res, { isFinal: index === batches.length - 1 }));
        }, Promise.resolve([]));
      })
      .then(() => {
        res.write(']');
        res.end();
      });
  }
};
