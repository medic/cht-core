const db = require('../db'),
      async = require('async'),
      userDb = require('../lib/user-db'),
      BATCH_SIZE = 100;

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

const extract = (response, callback) => {
  const toSave = {};
  response.rows.forEach(row => {
    const doc = row.doc;
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

const query = (skip, callback) => {
  const options = {
    key: [ 'data_record' ],
    include_docs: true,
    limit: BATCH_SIZE,
    skip: skip
  };
  db.medic.view('medic-client', 'doc_by_type', options, callback);
};

module.exports = {
  name: 'extract-read-status',
  created: new Date(2017, 6, 7),
  run: callback => {
    db.batch(query, extract, BATCH_SIZE, callback);
  }
};
