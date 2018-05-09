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

const updateParentContacts = (docs, batchSize, attemptCounts) => {
  const batch = docs.splice(0, batchSize);
  batch.forEach(doc => {
    attemptCounts[doc._id] = (attemptCounts[doc._id] || 0) + 1;
  });
  const parentMap = {};
  return utils.updateParentContacts(batch, parentMap)
    .then(docsToUpdate => {
      if (!docsToUpdate.length) {
        return [];
      }
      return db.medic.bulkDocs(docsToUpdate)
        .then(result => {
          const errorIds = result
            .map((docUpdate, index) => docUpdate.error && docUpdate.status !== 404 && (docUpdate.id || docsToUpdate[index]._id))
            .filter(id => id);
          errorIds.forEach(id => {
            const doc = parentMap[id];
            if (attemptCounts[doc._id] < 4) {
              docs.push(doc);
              result = result.filter(docUpdate => docUpdate.id !== id);
            }
          });
          if (docs.length > 0) {
            return updateParentContacts(docs, batchSize, attemptCounts);
          }
          return result;
        });
    });
};

const deleteInBatches = (idsToDelete, batchSize, attemptCounts, res) => {
  const batch = idsToDelete.splice(0, batchSize);
  batch.forEach(id => {
    attemptCounts[id] = (attemptCounts[id] || 0) + 1;
  });
  let docsToDelete;
  let deletionResponse;
  return db.medic.allDocs({ keys: batch, include_docs: true })
    .then(result => {
      docsToDelete = markAsDeleted(result);
      return db.medic.bulkDocs(docsToDelete);
    })
    .then(result => {
      deletionResponse = result;
      const errorIds = deletionResponse
        .map((docUpdate, index) => docUpdate.error && docUpdate.status !== 404 && (docUpdate.id || docsToDelete[index]._id))
        .filter(id => id);
      errorIds.forEach(id => {
        if (attemptCounts[id] < 4) {
          idsToDelete.push(id);
          deletionResponse = deletionResponse.filter(docUpdate => docUpdate.id !== id);
        }
      });
      const successfullyDeletedDocs = docsToDelete.filter(doc => !errorIds.includes(doc._id));
      const updateAttemptCounts = {};
      return updateParentContacts(successfullyDeletedDocs, batchSize, updateAttemptCounts);
    })
    .then(updateResponse => {
      let resString = JSON.stringify(deletionResponse.concat(updateResponse));
      if (idsToDelete.length > 0) {
        resString += ',';
        res.write(resString);
        return deleteInBatches(idsToDelete, batchSize, attemptCounts, res);
      }
      res.write(resString);
    });
};

module.exports = {
  bulkDelete: (docs, res, { batchSize = 100 } = {}) => {
    checkForDuplicates(docs);
    const ids = docs.map(doc => doc._id);
    const attemptCounts = {};
    res.type('application/json');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.write('[');
    return deleteInBatches(ids, batchSize, attemptCounts, res)
      .then(() => {
        res.write(']');
        res.end();
      });
  }
};
