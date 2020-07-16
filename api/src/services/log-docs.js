const moment = require('moment');
const db = require('../db');

const persistLog = (logDocName, info) => {
  if (!logDocName || !info) {
    const error = new Error('Error when persisting log: Log Document Name or Log Information missing.');
    return Promise.reject(error);
  }

  const logDoc = Object.assign({ _id: logDocName }, info);

  return db.medicLogs.put(logDoc);
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

  const logDocName = `replication-count-${username}`;
  const info = {
    user: { username },
    log_date: moment().valueOf(),
    count,
    limit
  };

  return persistLog(logDocName, info);
};

module.exports = {
  logReplicationLimitExceeded,
  getReplicationLimitExceededLog
};
