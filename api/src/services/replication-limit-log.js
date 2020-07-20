const moment = require('moment');
const db = require('../db');
const logger = require('../logger');

const LOG_TYPES = {
  replicationCount: 'replication-count-'
};
const LOG_COUNT_DIFF = 100;
const LOG_MONTH_DIFF = 1;

const persistLog = (info) => {
  if (!info || !info.user || !info.user.user_name) {
    const error = new Error('Error when persisting log: Log Information missing.');
    return Promise.reject(error);
  }

  const logDocId = LOG_TYPES.replicationCount + info.user.user_name;

  return db.medicLogs
    .get(logDocId)
    .catch(error => {
      if (error.status === 404) {
        return { _id: logDocId };
      }
      throw error;
    })
    .then(doc => {
      if (!isLogDifferent(doc, info)) {
        return;
      }

      const logDoc = Object.assign(doc, info);
      return db.medicLogs.put(logDoc);
    });
};

const isLogDifferent = (oldLog, newLog) => {
  if (!oldLog.log_date && !oldLog.count) {
    return true;
  }

  const oldLogDate = moment(oldLog.log_date);
  const newLogDate = moment(newLog.log_date);
  const monthDiff = newLogDate.diff(oldLogDate, 'months', true);
  const countDiff = Math.abs(oldLog.count - newLog.count);

  return monthDiff > LOG_MONTH_DIFF || countDiff > LOG_COUNT_DIFF;
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

const getReplicationLimitLog = (userName) => {
  if (!userName) {
    return getLogsByType(LOG_TYPES.replicationCount);
  }

  return getLogById(LOG_TYPES.replicationCount + userName);
};

const logReplicationLimit = (userName, count, limit) => {
  const info = {
    user: {
      user_name: userName
    },
    log_date: moment().valueOf(),
    count,
    limit
  };

  return persistLog(info)
    .catch(error => {
      logger.error('Error on Log Replication Limit %o', error);
    });
};

module.exports = {
  put: logReplicationLimit,
  get: getReplicationLimitLog,
  _isLogDifferent: isLogDifferent,
  LOG_TYPES
};
