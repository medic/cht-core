const db = require('../db');

const LOG_TYPE = 'connected-user-';
const UPDATE_TIME_INTERVAL = 30 * 60 * 1000; // 30 minutes

const saveLog = (log) => {
  if (!log || !log.user) {
    const error = new Error('Error when saving log: Log Information missing');
    return Promise.reject(error);
  }
  
  const logKey = (suffix = '') => LOG_TYPE + suffix;
  const id = logKey(log.user);

  return db.medicLogs
    .get(id)
    .catch(error => {
      if (error.status === 404) {
        return { _id: id };
      }
      throw error;
    })
    .then(doc => {
      if (log.timestamp - doc.timestamp < UPDATE_TIME_INTERVAL) {
        return;
      }
      const logDoc = Object.assign(doc, log);
      return db.medicLogs.put(logDoc);
    });
};

module.exports = {
  save: saveLog
};
