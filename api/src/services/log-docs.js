const moment = require('moment');
const db = require('../db');

const persistLog = (logDocId, info) => {
  if (!logDocId || !info) {
    const error = new Error('Error when persisting log: Log Document ID or Log Information missing.');
    return Promise.reject(error);
  }

  return db.medicLogs
    .get(logDocId)
    .catch(error => {
      if (error.status === 404) {
        return { _id: logDocId };
      }
      throw error;
    })
    .then(doc => {
      const logDoc = Object.assign(doc, info);
      return db.medicLogs.put(logDoc);
    });
};

const getReplicationLimitExceededLog = (username) => {
  if (!username) {
    const error = new Error('Error on getting Replication Limit Exceeded Log: Missing user name');
    return Promise.reject(error);
  }

  return db.medicLogs.get(`replication-count-${username}`);
};

const logReplicationLimitExceeded = (username, count, limit) => {
  if (!username || !count || !limit) {
    const error = new Error(`Error on logging Replication Limit Exceeded: Missing required data, user: ${username}`);
    return Promise.reject(error);
  }

  const logDocId = `replication-count-${username}`;
  const info = {
    user: { username },
    log_date: moment().valueOf(),
    count,
    limit
  };

  return persistLog(logDocId, info);
};

module.exports = {
  logReplicationLimitExceeded,
  getReplicationLimitExceededLog
};
