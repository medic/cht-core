const request = require('@medic/couch-request');
const moment = require('moment');

const db = require('../db');
const environment = require('../environment');
const logger = require('@medic/logger');
const deployInfoService = require('./deploy-info');

const DBS_TO_MONITOR = {
  'medic': environment.db,
  'sentinel': environment.db + '-sentinel',
  'usersmeta': environment.db + '-users-meta',
  'users': '_users'
};

const MESSAGE_QUEUE_STATUS_KEYS = ['due', 'scheduled', 'muted', 'failed', 'delivered'];
const fromEntries = (keys, value) => {
  // "shim" of Object.fromEntries
  const result = {};
  keys.forEach(key => result[key] = value);
  return result;
};

const getSequenceNumber = seq => {
  if (seq) {
    const parts = seq.split('-');
    const result = parseInt(parts?.[0]);
    if (!isNaN(result)) {
      return result;
    }
  }
  return -1;
};

const getAppVersion = async () => {
  try {
    const deployInfo = await deployInfoService.get();
    return deployInfo.version;
  } catch (err) {
    logger.error('Error fetching app version: %o', err);
    return '';
  }
};

const getSentinelProcessedSeq = () => {
  return db.sentinel
    .get('_local/transitions-seq')
    .then(metadata => metadata.value)
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

const getOutgoingMessageStatusCounts = () => {
  return db.medic.query('medic-admin/message_queue', { reduce: true, group_level: 1 })
    .then(counts => {
      const result = fromEntries(MESSAGE_QUEUE_STATUS_KEYS, 0);
      counts.rows.forEach(row => {
        result[row.key[0]] = row.value;
      });
      return result;
    })
    .catch(err => {
      logger.error('Error fetching outgoing message status count: %o', err);
      return fromEntries(MESSAGE_QUEUE_STATUS_KEYS, -1);
    });
};

const getWeeklyOutgoingMessageStatusCounts = () => {
  const startDate = moment().startOf('day').subtract(7, 'days').valueOf();
  const endDate = moment().valueOf();

  const optionsList = MESSAGE_QUEUE_STATUS_KEYS.map(key => ({
    start_key: [key, startDate],
    end_key: [key, endDate],
    reduce: true,
  }));

  const query = (options) => db.medic
    .query('medic-admin/message_queue', options)
    .catch(err => {
      logger.error(`Error fetching weekly outgoing message status counts ${options.start_key}: %o`, err);
      return { rows: [{ value: -1 }] };
    });

  return Promise
    .all(optionsList.map(options => query(options)))
    .then(counts => {
      const result = fromEntries(MESSAGE_QUEUE_STATUS_KEYS, 0);
      counts.forEach((count, idx) => {
        const row = count?.rows?.[0];
        if (row) {
          result[MESSAGE_QUEUE_STATUS_KEYS[idx]] = row.value;
        }
      });

      return result;
    });
};

const getLastHundredStatusCountsPerGroup = ({group, statuses}) => {
  const options = {
    descending: true,
    start_key: [group, moment().valueOf()],
    endkey: [group, 0],
    limit: 100,
  };

  return db.medic
    .query('medic-sms/messages_by_last_updated_state', options)
    .then(results => {
      const counts = fromEntries(statuses, 0);
      results.rows.forEach(row => {
        const status = row.key[2];
        counts[status] = counts[status] || 0;
        counts[status]++;
      });

      return counts;
    })
    .catch(err => {
      logger.error(`Error fetching last 100 final status messages: %o`, err);
      return fromEntries(statuses, -1);
    });
};

const getLastHundredStatusUpdatesCounts = () => {
  const groups = [
    { group: 'pending', statuses: ['pending', 'forwarded-to-gateway', 'received-by-gateway', 'forwarded-by-gateway'] },
    { group: 'final', statuses: ['sent', 'delivered', 'failed'] },
    { group: 'muted', statuses: ['denied', 'cleared', 'muted', 'duplicate'] },
  ];

  return Promise
    .all(groups.map(group => getLastHundredStatusCountsPerGroup(group)))
    .then(([pending, final, muted]) => {
      return { pending, final, muted };
    });
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

const getConnectedUserLogs = (connectedUserInterval) => {
  const earliestTimestamp = moment().subtract(connectedUserInterval, 'days').valueOf();
  return db.medicLogs
    .query('logs/connected_users', { startkey: earliestTimestamp, reduce: true })
    .then(result => getResultCount(result))
    .catch(err => {
      logger.error('Error fetching connected users logs: %o', err);
      return -1;
    });
};

const jsonV1 = (connectedUserInterval) => {
  return Promise
    .all([
      getAppVersion(),
      getCouchVersion(),
      getDbInfos(),
      getSentinelBacklog(),
      getOutboundPushQueueLength(),
      getOutgoingMessageStatusCounts(),
      getFeedbackCount(),
      getConflictCount(),
      getReplicationLimitLog(),
      getConnectedUserLogs(connectedUserInterval)
    ])
    .then(([
      appVersion,
      couchVersion,
      dbInfos,
      sentinelBacklog,
      outboundPushBacklog,
      outgoingMessageStatus,
      feedbackCount,
      conflictCount,
      replicationLimitLogs,
      connectedUserLogs
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
            state: outgoingMessageStatus
          }
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
        },
        connected_users: {
          count: connectedUserLogs
        }
      };
    });
};

const jsonV2 = (connectedUserInterval) => {
  return Promise
    .all([
      jsonV1(connectedUserInterval),
      getWeeklyOutgoingMessageStatusCounts(),
      getLastHundredStatusUpdatesCounts(),
    ])
    .then(([jsonV1, weeklyOutgoingMessageStatus, lastHundredCounts]) => {
      jsonV1.messaging.outgoing = {
        total: jsonV1.messaging.outgoing.state,
        seven_days: weeklyOutgoingMessageStatus,
        last_hundred: lastHundredCounts,
      };

      return jsonV1;
    });
};

module.exports = {
  jsonV1,
  jsonV2,
};
