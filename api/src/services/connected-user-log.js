const moment = require('moment');
const db = require('../db');

const LOG_TYPE = 'connected-user-';
const TIME_INTERVAL = 30 * 60 * 1000; // 30 minutes

const saveLog = (log) => {
  if (!log || !log.user) {
    const error = new Error('Error when saving log: Log Information missing.');
    return Promise.reject(error);
  }
  const id = LOG_TYPE + log.user;
  return db.medicLogs
    .get(id)
    .catch(error => {
      if (error.status === 404) {
        return { _id: id };
      }
      throw error;
    })
    .then(doc => {
      if (log.timestamp - doc.timestamp < TIME_INTERVAL) {
        return;
      }
      const logDoc = Object.assign(doc, log);
      return db.medicLogs.put(logDoc);
    });
};

const getLogs = (interval) => {
  const options = {
    startkey: LOG_TYPE,
    endkey: LOG_TYPE + '\ufff0',
    include_docs: true
  };
  const earliestTimestamp = moment().subtract(interval, 'days').valueOf();
  return db.medicLogs
    .allDocs(options)
    .then((result) => result.rows.map(row => {
      if(row.doc.timestamp > earliestTimestamp) {
        return row.doc;
      }
    }));
};

module.exports = {
  get: getLogs,
  save: saveLog
};
