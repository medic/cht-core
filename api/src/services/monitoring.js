const request = require('request-promise-native');

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

const getOutgoingMessageStatusCounts = () => {
  return db.medic.query('medic-admin/message_queue', { reduce: true, group_level: 1 })
    .then(counts => {
      const result = {
        due: 0,
        scheduled: 0,
        muted: 0
      };
      counts.rows.forEach(row => {
        result[row.key[0]] = row.value;
      });
      return result;
    })
    .catch(err => {
      logger.error('Error fetching outgoing message status count: %o', err);
      return {
        due: -1,
        scheduled: -1,
        muted: -1
      };
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
      getFeedbackCount(),
      getConflictCount()
    ])
    .then(([
      appVersion,
      couchVersion,
      dbInfos,
      sentinelBacklog,
      outboundPushBacklog,
      outgoingMessageStatus,
      feedbackCount,
      conflictCount
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
        }
      };
    });
};

module.exports = {
  json
};
