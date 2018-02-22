const PouchDB = require('pouchdb-core');
PouchDB.plugin(require('pouchdb-adapter-http'));
PouchDB.plugin(require('pouchdb-mapreduce'));

const DB = new PouchDB(process.env.COUCH_URL);

const utils = require('bulk-docs-utils')({
  Promise: Promise,
  DB: DB,
  log: console
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

const generateBatches = (docs, batchSize) => {
  const batches = [];
  while (docs.length > 0) {
    const batch = docs.splice(0, batchSize);
    batches.push(batch);
  }
  return batches;
};

const generateBatchPromise = (batch, res, { isFinal } = {}) => {
  return DB.bulkDocs(batch).then(result => {
    let resString = JSON.stringify(result);
    resString += isFinal ? '' : ',';
    res.write(resString);
  });
};

module.exports = {
  bulkDelete: (req, res, { batchSize = 100 } = {}) => {
    let docsToDelete;
    const keys = req.body.docs.map(doc => doc._id);
    return DB.allDocs({ keys, include_docs: true })
      .then(result => {
        docsToDelete = markAsDeleted(result);
        return utils.updateParentContacts(docsToDelete);
      })
      .then(docsToUpdate => {
        const allDocs = docsToDelete.concat(docsToUpdate);
        utils.checkForDuplicates(allDocs);
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
