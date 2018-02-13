var db = require('../db'),
    serverUtils = require('./server-utils');

const extractDocs = data => {
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

const generateBatchPromise = (batch, res, options) => {
  options = options || {};
  return new Promise((resolve, reject) => {
    db.medic.bulk({ docs: batch }, function (err, body) {
      if (err) {
        reject(err);
      }

      let resString = JSON.stringify(body);
      resString += options.isFinal ? '' : ',';
      res.write(resString);
      resolve(body);
    });
  });
};

const setupBatchPromises = (batches, res) => {
  return batches.reduce((promise, batch, index) => {
    return promise.then(() => generateBatchPromise(batch, res, { isFinal: index === batches.length - 1 }));
  }, Promise.resolve([]));
};

module.exports = {
  bulkDelete: (req, res) => {
    const keys = req.body.docs.map(doc => doc._id);
    db.medic.fetch({ keys }, function(err, data) {
      if (err) {
        return serverUtils.error(err, req, res);
      }

      const BATCH_SIZE = 100;
      const docs = extractDocs(data);
      const batches = generateBatches(docs, BATCH_SIZE);
      const sendBatches = setupBatchPromises(batches, res);

      res.type('application/json');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.write('[');
      sendBatches
        .then(() => {
          res.write(']');
          res.end();
        })
        .catch(err => {
          serverUtils.error(err, req, res);
        });
    });
  }
};
