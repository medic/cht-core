const db = require('../db-pouch');
const utils = require('bulk-docs-utils')({
  Promise: Promise,
  DB: db.medic
});

const extractDocs = data => {
  return data.rows
    .map(row => row.doc)
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

const generateBatches = (ids, batchSize) => {
  const batches = [];
  while (ids.length > 0) {
    const batch = ids.splice(0, batchSize);
    batches.push(batch);
  }
  return batches;
};

const fetchDocs = ids => {
  if (ids.length === 0) {
    return Promise.resolve([]);
  }
  return db.medic.allDocs({ keys: ids, include_docs: true })
    .then(extractDocs);
};

const incrementAttemptCounts = (docs, attemptCounts) => {
  docs.forEach(doc => {
    attemptCounts[doc._id] = (attemptCounts[doc._id] || 0) + 1;
  });
};

const deleteDocs = (docsToDelete, deletionAttemptCounts, updateAttemptCounts, cumulativeResult = []) => {
  const finishedModifications = cumulativeResult.map(docUpdate => docUpdate.id);
  const parentMap = {};
  let docsToUpdate;
  let docsToModify;
  docsToDelete.forEach(doc => doc._deleted = true);
  incrementAttemptCounts(docsToDelete, deletionAttemptCounts);
  return utils.updateParentContacts(docsToDelete, parentMap)
    .then(updatedParents => {
      docsToUpdate = updatedParents;
      incrementAttemptCounts(docsToUpdate, updateAttemptCounts);
      docsToModify = docsToDelete.concat(docsToUpdate).filter(doc => !finishedModifications.includes(doc._id));
      return db.medic.bulkDocs(docsToModify);
    })
    .then(result => {
      result = result.filter(docUpdate => docUpdate.status !== 404);
      const deletionFailures = [];
      const updateFailures = [];
      const deletionIds = docsToDelete.map(doc => doc._id);
      const updateIds = docsToUpdate.map(doc => doc._id);
      const errorIds = result
        .map((docUpdate, index) => docUpdate.error && (docUpdate.id || docsToModify[index]._id))
        .filter(id => id);
      errorIds.forEach(id => {
        if (deletionIds.includes(id) && deletionAttemptCounts[id] < 4) {
          deletionFailures.push(id);
          result = result.filter(docUpdate => docUpdate.id !== id);
        } else if (updateIds.includes(id) && updateAttemptCounts[id] < 4) {
          updateFailures.push(id);
          result = result.filter(docUpdate => docUpdate.id !== id);
        }
      });

      cumulativeResult = cumulativeResult.concat(result);
      if (deletionFailures.length > 0 || updateFailures.length > 0) {
        return fetchDocs(deletionFailures)
          .then(docsToDelete => {
            const updatesToRetry = updateFailures.map(id => parentMap[id]);
            return deleteDocs(docsToDelete.concat(updatesToRetry), deletionAttemptCounts, updateAttemptCounts, cumulativeResult);
          });
      }
      return cumulativeResult;
    });
};

module.exports = {
  bulkDelete: (docs, res, { batchSize = 100 } = {}) => {
    checkForDuplicates(docs);
    const ids = docs.map(doc => doc._id);
    const batches = generateBatches(ids, batchSize);
    const deletionAttemptCounts = {};
    const updateAttemptCounts = {};
    res.type('application/json');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.write('[');
    return batches.reduce((promise, batch, index) => {
      return promise
        .then(() => fetchDocs(batch))
        .then(docsToDelete => deleteDocs(docsToDelete, deletionAttemptCounts, updateAttemptCounts))
        .then(result => {
          let resString = JSON.stringify(result);
          if (index !== batches.length - 1) {
            resString += ',';
          }
          res.write(resString);
        });
    }, Promise.resolve())
      .then(() => {
        res.write(']');
        res.end();
      });
  }
};
