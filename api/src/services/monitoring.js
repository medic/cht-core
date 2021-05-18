const request = require('request-promise-native');
const moment = require('moment');

const db = require('../db');
const environment = require('../environment');
const logger = require('../logger');

const DBS_TO_MONITOR = {
  'medic': environment.db,
  'sentinel': environment.db + '-sentinel',
  'usersmeta': environment.db + '-users-meta',
  'users': '_users'
};

const getSequenceNumber = seq => {
  if (seq) {
    const parts = seq.split('-');
    if (parts.length) {
      const result = parseInt(parts[0]);
      if (!isNaN(result)) {
        return result;
      }
    }
  }
  return -1;
};

const getAppVersion = () => {
  return db.medic.get('_design/medic')
    .then(ddoc => (ddoc.deploy_info && ddoc.deploy_info.version) || ddoc.version)
    .catch(err => {
      logger.error('Error fetching app version: %o', err);
      return '';
    });
};

const getSentinelProcessedSeq = () => {
  return db.sentinel.get('_local/sentinel-meta-data')
    .then(metadata => metadata.processed_seq)
    .catch(err => {
      if (err.status === 404) {
        // sentinel has not processed anything yet
        return 0;
      }
      throw err;
    });
};

const getSentinelBacklog = () => {
  return getSentinelProcessedSeq()
    .then(processedSeq => {
      // Use request as the PouchDB changes API doesn't return the "pending" value we need
      return request.get({
        url: `${environment.couchUrl}/_changes`,
        qs: { since: processedSeq, limit: 0 },
        json: true
      });
    })
    .then(changes => changes.pending)
    .catch(err => {
      logger.error('Error fetching sentinel backlog: %o', err);
      return -1;
    });
};

const getCouchVersion = () => {
  return request
    .get({
      url: environment.serverUrl,
      json: true
    })
    .then(info => info.version)
    .catch(err => {
      logger.error('Error fetching couch version: %o', err);
      return '';
    });
};

const defaultNumber = x => typeof x === 'number' ? x : -1;

const getFragmentation = sizes => {
  if (!sizes || sizes.active <= 0) {
    return -1;
  }
  return sizes.file / sizes.active;
};

const mapDbInfo = dbInfo => {
  return {
    name: dbInfo.db_name || '',
    update_sequence: getSequenceNumber(dbInfo.update_seq),
    doc_count: defaultNumber(dbInfo.doc_count),
    doc_del_count: defaultNumber(dbInfo.doc_del_count),
    fragmentation: getFragmentation(dbInfo.sizes)
  };
};

const getDbInfos = () => {
  const result = {};
  return request
    .post({
      url: `${environment.serverUrl}/_dbs_info`,
      json: true,
      body: { keys: Object.values(DBS_TO_MONITOR) },
      headers: { 'Content-Type': 'application/json' }
    })
    .then(dbInfos => {
      dbInfos.forEach((dbInfo, i) => {
        result[Object.keys(DBS_TO_MONITOR)[i]] = mapDbInfo(dbInfo.info);
      });
    })
    .catch(err => {
      logger.error('Error fetching db info: %o', err);
      Object.keys(DBS_TO_MONITOR).forEach(key => {
        result[key] = mapDbInfo({});
      });
    })
    .then(() => result);
};

const getResultCount = result => result.rows.length ? result.rows[0].value : 0;

const getConflictCount = () => {
  return db.medic.query('medic-conflicts/conflicts', { reduce: true })
    .then(result => getResultCount(result))
    .catch(err => {
      logger.error('Error fetching conflict count: %o', err);
      return -1;
    });
};

const getOutboundPushQueueLength = () => {
  return db.sentinel.query('sentinel/outbound_push_tasks')
    .then(result => getResultCount(result))
    .catch(err => {
      logger.error('Error fetching outbound push queue length: %o', err);
      return -1;
    });
};

const getFeedbackCount = () => {
  return db.medicUsersMeta.query('users-meta/feedback_by_date')
    .then(result => getResultCount(result))
    .catch(err => {
      logger.error('Error fetching feedback count: %o', err);
      return -1;
    });
};

const STATUS_KEYS = ['due', 'scheduled', 'muted', 'failed', 'delivered'];

const getOutgoingMessageStatusCounts = () => {
  return db.medic.query('medic-admin/message_queue', { reduce: true, group_level: 1 })
    .then(counts => {
      const result = Object.fromEntries(STATUS_KEYS.map(key => ([key, 0])));
      counts.rows.forEach(row => {
        result[row.key[0]] = row.value;
      });
      return result;
    })
    .catch(err => {
      logger.error('Error fetching outgoing message status count: %o', err);
      return Object.fromEntries(STATUS_KEYS.map(key => ([key, -1])));
    });
};

const getWeeklyOutgoingMessageStatusCounter = () => {
  const startDate = moment().startOf('day').subtract(7, 'days').valueOf();
  const endDate = moment().valueOf();

  const options = STATUS_KEYS.map(key => ({
    start_key: [key, startDate],
    end_key: [key, endDate],
    reduce: true,
  }));

  const query = (options) => db.medic
    .query('medic-admin/message_queue', options)
    .catch(err => {
      logger.error(`Error fetching outgoing message status counts ${options.start_key}: %o`, err);
      return { rows: [{ value: -1 }] };
    });

  return Promise
    .all(options.map(options => query(options)))
    .then(counts => {
      const result = Object.fromEntries(STATUS_KEYS.map(key => ([key, 0])));
      counts.forEach((count, idx) => {
        const row = count && count.rows && count.rows[0];
        if (row) {
          result[STATUS_KEYS[idx]] = row.value;
        }
      });

      return result;
    });
};

const getLastMessagesOutgoingStateCounter = () => {

};

const getReplicationLimitLog = () => {
  return db.medicLogs
    .query('logs/replication_limit')
    .then(result => getResultCount(result))
    .catch(err => {
      logger.error('Error fetching replication limit logs: %o', err);
      return -1;
    });
};

const json = () => {
  return Promise
    .all([
      getAppVersion(),
      getCouchVersion(),
      getDbInfos(),
      getSentinelBacklog(),
      getOutboundPushQueueLength(),
      getOutgoingMessageStatusCounts(),
      getWeeklyOutgoingMessageStatusCounter(),
      getFeedbackCount(),
      getConflictCount(),
      getReplicationLimitLog()
    ])
    .then(([
      appVersion,
      couchVersion,
      dbInfos,
      sentinelBacklog,
      outboundPushBacklog,
      outgoingMessageStatus,
      weeklyOutgoingMessageStatus,
      feedbackCount,
      conflictCount,
      replicationLimitLogs
    ]) => {
      return {
        version: {
          app: appVersion,
          node: process.version,
          couchdb: couchVersion
        },
        couchdb: dbInfos,
        date: {
          current: (new Date()).valueOf(),
          uptime: process.uptime()
        },
        sentinel: {
          backlog: sentinelBacklog
        },
        messaging: {
          outgoing: {
            total: outgoingMessageStatus,
            seven_days: weeklyOutgoingMessageStatus,
          },
        },
        outbound_push: {
          backlog: outboundPushBacklog
        },
        feedback: {
          count: feedbackCount
        },
        conflict: {
          count: conflictCount
        },
        replication_limit: {
          count: replicationLimitLogs
        }
      };
    });
};

module.exports = {
  json
};
