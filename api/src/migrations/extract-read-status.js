const db = require('../db-nano'),
      {promisify} = require('util'),
      async = require('async'),
      userDb = require('../services/user-db'),
      batch = require('../db-batch');

const createReadStatusDoc = record => {
  const type = record.form ? 'report' : 'message';
  const id = `read:${type}:${record._id}`;
  return { _id: id };
};

const ensureDbExists = (username, dbName, callback) => {
  db.db.get(dbName, err => {
    if (err && err.statusCode === 404) {
      return userDb.create(username, callback);
    }
    callback(err);
  });
};

const saveReadStatusDocs = (username, docs, callback) => {
  const userDbName = userDb.getDbName(username);
  ensureDbExists(username, userDbName, err => {
    if (err) {
      return callback(err);
    }
    const userDb = db.use(userDbName);
    userDb.bulk({ docs: docs }, callback);
  });
};

const extract = (docs, callback) => {
  const toSave = {};
  docs.forEach(doc => {
    if (doc.read) {
      doc.read.forEach(user => {
        if (!toSave[user]) {
          toSave[user] = [];
        }
        toSave[user].push(createReadStatusDoc(doc));
      });
    }
  });
  async.each(
    Object.keys(toSave),
    (username, callback) => saveReadStatusDocs(username, toSave[username], callback),
    callback
  );
};

module.exports = {
  name: 'extract-read-status',
  created: new Date(2017, 6, 7),
  run: promisify(callback => {
    batch.view('medic-client', 'doc_by_type', { key: [ 'data_record' ] }, extract, callback);
  })
};
