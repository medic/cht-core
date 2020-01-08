const db = require('../db');
const userDb = require('../services/user-db');
const batch = require('../db-batch');

const createReadStatusDoc = record => {
  const type = record.form ? 'report' : 'message';
  const id = `read:${type}:${record._id}`;
  return { _id: id };
};

const saveReadStatusDocs = (username, docs) => {
  const userDbName = userDb.getDbName(username);
  return userDb.create(userDbName).then(() => {
    const userDb = db.get(userDbName);
    return userDb.bulkDocs(docs).then(result => {
      db.close(userDb);
      return result;
    });
  });
};

const extract = docs => {
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
  return Promise.all(Object.keys(toSave).map(username => {
    return saveReadStatusDocs(username, toSave[username]);
  }));
};

module.exports = {
  name: 'extract-read-status',
  created: new Date(2017, 6, 7),
  run: () => {
    return batch.view('medic-client/doc_by_type', { key: [ 'data_record' ] }, extract);
  }
};
