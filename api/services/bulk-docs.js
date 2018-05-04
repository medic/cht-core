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

const getDocsToModify = ids => {
  let docsToDelete;
  let allDocs;
  return db.medic.allDocs({ keys: ids, include_docs: true })
    .then(result => {
      docsToDelete = markAsDeleted(result);
      return utils.updateParentContacts(docsToDelete);
    })
    .then(docsToUpdate => {
      allDocs = docsToDelete.concat(docsToUpdate);
      checkForDuplicates(allDocs);
      return allDocs;
    });
};

const deleteBatches = (batches, res, docsToRetry, attemptNumber) => {
  return batches.reduce((promise, batch, index) => {
    const isFinal = index === batches.length - 1;
    let docsToModify;
    return promise
      .then(() => {
        return getDocsToModify(batch);
      })
      .then(allDocs => {
        docsToModify = allDocs;
        return db.medic.bulkDocs(docsToModify);
      })
      .then(result => {
        const errors = result.map(docUpdate => docUpdate.error);
        const errorIds = docsToModify
          .filter((doc, index) => errors[index])
          .map(doc => doc._id);
        errorIds.forEach(id => docsToRetry.push(id));

        let resString = JSON.stringify(result);
        if ((!isFinal || docsToRetry.length) && attemptNumber !== 3) {
          resString += ',';
        }
        res.write(resString);
      });
  }, Promise.resolve());
};

module.exports = {
  bulkDelete: (docs, res, { batchSize = 100 } = {}) => {
    const ids = docs.map(doc => doc._id);
    const batches = generateBatches(ids, batchSize);
    let docsToRetry = [];
    res.type('application/json');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.write('[');
    return deleteBatches(batches, res, docsToRetry, 0)
      .then(() => {
        // Retry any failures a maximum of 3 times
        return [1, 2, 3].reduce((promise, attemptNumber) => {
          if (docsToRetry.length === 0) {
            return promise;
          }
          const batches = generateBatches(docsToRetry, batchSize);
          docsToRetry.length = 0;
          return promise.then(() => deleteBatches(batches, res, docsToRetry, attemptNumber));
        }, Promise.resolve());
      })
      .then(() => {
        res.write(']');
        res.end();
      });
  }
};
