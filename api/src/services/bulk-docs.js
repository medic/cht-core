const db = require('../db-pouch');
const utils = require('bulk-docs-utils')({
  Promise: Promise,
  DB: db.medic
});
const ATTEMPT_LIMIT = 3;

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

const getFailuresToRetry = (updateStatuses, docsToDelete, docsToUpdate, deletionAttemptCounts, updateAttemptCounts) => {
  const deletionFailures = [];
  const updateFailures = [];
  const deletionIds = docsToDelete.map(doc => doc._id);
  const updateIds = docsToUpdate.map(doc => doc._id);
  const errorIds = updateStatuses
    .map(docUpdate => docUpdate.error && docUpdate.id)
    .filter(id => id);
  errorIds.forEach(id => {
    // Retry any errors for which the attempt limit has not been reached
    if (deletionIds.includes(id) && deletionAttemptCounts[id] <= ATTEMPT_LIMIT) {
      deletionFailures.push(id);
    } else if (updateIds.includes(id) && updateAttemptCounts[id] <= ATTEMPT_LIMIT) {
      updateFailures.push(id);
    }
  });
  return { deletionFailures, updateFailures };
};

const deleteDocs = (docsToDelete, deletionAttemptCounts = {}, updateAttemptCounts = {}, finalUpdateStatuses = []) => {
  let docsToUpdate;
  let docsToModify;
  let documentByParentId;

  docsToDelete.forEach(doc => doc._deleted = true);
  incrementAttemptCounts(docsToDelete, deletionAttemptCounts);

  return utils.updateParentContacts(docsToDelete)
    .then(updatedParents => {
      documentByParentId = updatedParents.documentByParentId;

      const deletionIds = docsToDelete.map(doc => doc._id);
      // Don't update any parents that are already marked for deletion
      docsToUpdate = updatedParents.docs.filter(doc => !deletionIds.includes(doc._id));
      incrementAttemptCounts(docsToUpdate, updateAttemptCounts);

      const finishedDocs = finalUpdateStatuses.map(docUpdate => docUpdate.id);
      // Don't attempt to update any docs that have already been deleted/updated
      docsToModify = docsToDelete.concat(docsToUpdate).filter(doc => !finishedDocs.includes(doc._id));

      return db.medic.bulkDocs(docsToModify);
    })
    .then(updateStatuses => {
      updateStatuses.forEach((docUpdate, index) => docUpdate.id = docsToModify[index]._id);
      updateStatuses = updateStatuses.filter(docUpdate => docUpdate.status !== 404);
      const { deletionFailures, updateFailures } = getFailuresToRetry(updateStatuses, docsToDelete, docsToUpdate, deletionAttemptCounts, updateAttemptCounts);
      // Don't send errors for docs that will be retried
      updateStatuses = updateStatuses.filter(docUpdate => !deletionFailures.includes(docUpdate.id) && !updateFailures.includes(docUpdate.id));
      finalUpdateStatuses = finalUpdateStatuses.concat(updateStatuses);

      if (deletionFailures.length > 0 || updateFailures.length > 0) {
        return fetchDocs(deletionFailures)
          .then(docsToDelete => {
            // Retry updates by resending through the child doc (ensuring the update is still necessary in case of conflict)
            const updatesToRetryThroughDocDeletions = updateFailures
              .map(id => documentByParentId[id])
              .filter(doc => !deletionFailures.includes(doc._id));
            return deleteDocs(docsToDelete.concat(updatesToRetryThroughDocDeletions), deletionAttemptCounts, updateAttemptCounts, finalUpdateStatuses);
          });
      }
      return finalUpdateStatuses;
    });
};

module.exports = {
  bulkDelete: (docs, res, { batchSize = 100 } = {}) => {
    checkForDuplicates(docs);
    const ids = docs.map(doc => doc._id);
    const batches = generateBatches(ids, batchSize);
    res.type('application/json');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.write('[');
    res.flush();
    return batches.reduce((promise, batch, index) => {
      return promise
        .then(() => fetchDocs(batch))
        .then(deleteDocs)
        .then(result => {
          let resString = JSON.stringify(result);
          if (index !== batches.length - 1) {
            resString += ',';
          }
          res.write(resString);
          res.flush();
        });
    }, Promise.resolve())
      .then(() => {
        res.write(']');
        res.flush();
        res.end();
      });
  }
};
