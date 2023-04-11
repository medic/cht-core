const moment = require('moment');
const db = require('../db');
const logger = require('../logger');
const DOC_IDS_WARN_LIMIT = 10000;

const LOG_TYPE = 'replication-count-';
// The count and month difference between old and new log.
// To determine when the old log will updated with the new one.
const LOG_COUNT_DIFF = 100;
const LOG_MONTH_DIFF = 1;

const persistLog = (info) => {
  if (!info || !info.user) {
    const error = new Error('Error when persisting log: Log Information missing.');
    return Promise.reject(error);
  }

  const logDocId = LOG_TYPE + info.user;

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
  if (!oldLog.date && !oldLog.count) {
    return true;
  }

  const countDiff = Math.abs(oldLog.count - newLog.count);

  if (countDiff > LOG_COUNT_DIFF) {
    return true;
  }

  const oldLogDate = moment(oldLog.date);
  const newLogDate = moment(newLog.date);
  const monthDiff = newLogDate.diff(oldLogDate, 'months', true);

  return monthDiff > LOG_MONTH_DIFF;
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

const getReplicationLimitLog = (userName) => {
  const get = !userName ? getLogsByType(LOG_TYPE) : db.medicLogs.get(LOG_TYPE + userName);

  return get
    .then(logs => {
      return {
        limit: DOC_IDS_WARN_LIMIT,
        users: logs
      };
    });
};

const logReplicationLimit = (userName, count) => {
  const info = {
    user: userName,
    date: moment().valueOf(),
    count
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
  LOG_TYPE,
  DOC_IDS_WARN_LIMIT,
};
