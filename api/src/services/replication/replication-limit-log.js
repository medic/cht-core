const moment = require('moment');
const db = require('../../db');
const logger = require('@medic/logger');
const DOC_IDS_WARN_LIMIT = 10000;

const LOG_TYPE = 'replication-count-';

// The log is rewritten on every successful replication so its `date` always reflects the user's last
// successful replication — this is what getStaleLogs relies on to detect users who have stopped
// replicating.
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

// Returns the replication limit logs whose last entry predates `cutoff` (ms timestamp) — i.e. users
// who have not successfully replicated since then. Each log's `date` is the user's last successful
// replication, since the log is rewritten on every successful replication (see persistLog). The
// staleness window is the caller's policy, so `cutoff` is required.
const getStaleLogs = (cutoff) => {
  return getLogsByType(LOG_TYPE)
    .then(logs => logs.filter(log => log.date && log.date < cutoff));
};

const logReplicationLimit = (userName, count, prePurgeCount) => {
  const info = {
    user: userName,
    date: moment().valueOf(),
    count,
    all_docs_count: prePurgeCount
  };

  return persistLog(info)
    .catch(error => {
      logger.error('Error on Log Replication Limit %o', error);
    });
};

module.exports = {
  put: logReplicationLimit,
  get: getReplicationLimitLog,
  getStaleLogs,
  LOG_TYPE,
  DOC_IDS_WARN_LIMIT,
};
