var db = require('../db'),
    serverUtils = require('./server-utils');

const bulkDelete = (req, res) => {
  const keys = req.body.docs.map(doc => doc._id);
  db.medic.fetch({ keys }, function(err, data) {
    if (err) {
      return serverUtils.error(err, req, res);
    }

    const docs = data.rows
      .map(row => {
          const doc = row.doc;
          if (doc) {
            doc._deleted = true;
            return doc;
          }
      })
      .filter(doc => doc);

    const BATCH_SIZE = 100;
    const batches = [];
    while (docs.length > 0) {
      const batch = docs.splice(0, BATCH_SIZE);
      batches.push(batch);
    }

    const generateBatchPromise = (batch, isFinal) => {
      return new Promise((resolve, reject) => {
        db.medic.bulk({ docs: batch }, function (err, body) {
          if (err) {
            reject(err);
          }

          let resString = JSON.stringify(body);
          resString += isFinal ? '' : ',';
          res.write(resString);
          resolve(body);
        });
      });
    };

    const sendBatches = batches.reduce((promise, batch, index) => {
      return promise.then(() => generateBatchPromise(batch, index === batches.length - 1));
    }, Promise.resolve([]));

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
};

module.exports.bulkDelete = bulkDelete;
