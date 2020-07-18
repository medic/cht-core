const moment = require('moment');
const db = require('../db');

const LOG_TYPES = {
  replicationCount: 'replication-count-'
};

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

const getLogsByType = (docPrefix) => {
  const options = {
    startkey: docPrefix,
    endkey: docPrefix + '\ufff0',
    include_docs: true
  };
  return db.medicLogs
    .allDocs(options)
    .then((result) => result.rows.map(row => row.doc));
};

const getLogById = (docId) => db.medicLogs.get(docId);

const getReplicationLimitExceededLog = (username) => {
  if (!username) {
    return getLogsByType(LOG_TYPES.replicationCount);
  }

  return getLogById(LOG_TYPES.replicationCount + username);
};

const logReplicationLimitExceeded = (username, count, limit) => {
  if (!username || !count || !limit) {
    const error = new Error(`Error on logging Replication Limit Exceeded: Missing required data, user: ${username}`);
    return Promise.reject(error);
  }

  const logDocId = LOG_TYPES.replicationCount + username;
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
  getReplicationLimitExceededLog,
  LOG_TYPES
};
