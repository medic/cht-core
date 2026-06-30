const moment = require('moment');
const db = require('../../db');
const logger = require('@medic/logger');
const DOC_IDS_WARN_LIMIT = 10000;

const LOG_TYPE = 'replication-count-';

// The log is rewritten on every successful replication so its `date` always reflects the user's last
// successful replication.
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

const getLogsForUsers = async (userNames) => {
  if (!userNames.length) {
    return {};
  }
  const result = await db.medicLogs.allDocs({ keys: userNames.map(name => LOG_TYPE + name), include_docs: true });
  const logsByUser = {};
  for (const row of result.rows) {
    if (row.doc) {
      logsByUser[row.doc.user] = row.doc;
    }
  }
  return logsByUser;
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
  getLogsForUsers,
  LOG_TYPE,
  DOC_IDS_WARN_LIMIT,
};
