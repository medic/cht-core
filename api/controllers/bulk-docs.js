var db = require('../db');

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
        return reject(err);
      }

      let resString = JSON.stringify(body);
      resString += options.isFinal ? '' : ',';
      res.write(resString);
      resolve();
    });
  });
};

const setupBatchPromises = (batches, res) => {
  return batches.reduce((promise, batch, index) => {
    return promise.then(() => generateBatchPromise(batch, res, { isFinal: index === batches.length - 1 }));
  }, Promise.resolve([]));
};

module.exports = {
  bulkDelete: (req, res, callback, options) => {
    options = options || {};
    options.batchSize = options.batchSize || 100;
    const keys = req.body.docs.map(doc => doc._id);
    db.medic.fetch({ keys }, function(err, data) {
      if (err) {
        return callback(err);
      }

      const docs = extractDocs(data);
      const batches = generateBatches(docs, options.batchSize);
      const sendBatches = setupBatchPromises(batches, res);

      res.type('application/json');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.write('[');
      sendBatches
        .then(() => {
          res.write(']');
          res.end();
          callback();
        })
        .catch(err => {
          return callback(err);
        });
    });
  }
};
