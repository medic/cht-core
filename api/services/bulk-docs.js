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

const getDocsToModify = ids => {
  let docsToDelete;
  return db.medic.allDocs({ keys: ids, include_docs: true })
    .then(result => {
      docsToDelete = markAsDeleted(result);
      return utils.updateParentContacts(docsToDelete);
    })
    .then(docsToUpdate => {
      const allDocs = docsToDelete.concat(docsToUpdate);
      checkForDuplicates(allDocs);
      return allDocs;
    });
};

const deleteInBatches = (ids, batchSize, attemptCounts, res) => {
  const batch = ids.splice(0, batchSize);
  batch.forEach(id => {
    attemptCounts[id] = (attemptCounts[id] || 0) + 1;
  });

  let docsToModify;
  return getDocsToModify(batch)
    .then(allDocs => {
      docsToModify = allDocs;
      return db.medic.bulkDocs(docsToModify);
    })
    .then(result => {
      const errorIds = result
        .map((docUpdate, index) => docUpdate.error && docUpdate.status !== 404 && (docUpdate.id || docsToModify[index]._id))
        .filter(id => id);
      errorIds.forEach(id => {
        if (attemptCounts[id] < 4) {
          ids.push(id);
          result = result.filter(docUpdate => docUpdate.id !== id);
        }
      });

      let resString = JSON.stringify(result);
      if (ids.length > 0) {
        resString += ',';
        res.write(resString);
        return deleteInBatches(ids, batchSize, attemptCounts, res);
      }
      res.write(resString);
    });
};

module.exports = {
  bulkDelete: (docs, res, { batchSize = 100 } = {}) => {
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
