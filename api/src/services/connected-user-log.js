const db = require('../db');

const LOG_TYPE = 'connected-user-';
const UPDATE_TIME_INTERVAL = 30 * 60 * 1000; // 30 minutes

const saveLog = (user) => {
  if (!user) {
    const error = new Error('Error when saving log: Log Information missing');
    return Promise.reject(error);
  }
  
  const id = LOG_TYPE + user;

  return db.medicLogs
    .get(id)
    .catch(error => {
      if (error.status === 404) {
        return { _id: id };
      }
      throw error;
    })
    .then(doc => {
      const now = new Date().getTime();
      if (doc.timestamp && now - doc.timestamp < UPDATE_TIME_INTERVAL) {
        return;
      }

      doc.user = user;
      doc.timestamp = now;
      return db.medicLogs.put(doc);
    });
};

module.exports = {
  save: saveLog
};
