const request = require('request-promise-native');

const db = require('../db');
const environment = require('../environment');
const serverUtils = require('../server-utils');
const cacheService = require('../services/cache');

const CACHE_NAME = 'monitoring';
const CACHE_KEY = 'result';

const DBS_TO_MONITOR = {
  'medic': environment.db,
  'sentinel': environment.db + '-sentinel',
  'usersmeta': environment.db + '-users-meta',
  'users': '_users'
};

const getSequenceNumber = seq => parseInt(seq.split('-')[0]);

const getAppVersion = () => {
  return db.medic.get('_design/medic')
    .then(ddoc => ddoc.version);
}

const getSentinelProcessedSeq = () => {
  return db.sentinel.get('_local/sentinel-meta-data')
    .then(metadata => getSequenceNumber(metadata.processed_seq))
    .catch(() => 0); // may not exist
};


const getCouchVersion = () => {
  return request
    .get({
      url: `${environment.serverUrl}`,
      json: true
    })
    .then(info => info.version);
};

const mapDbInfo = dbInfo => {
  const fragmentation = dbInfo.data_size > 0 ?
    dbInfo.disk_size / dbInfo.data_size : 0;
  return {
    name: dbInfo.db_name,
    update_sequence: getSequenceNumber(dbInfo.update_seq),
    doc_count: dbInfo.doc_count,
    doc_del_count: dbInfo.doc_del_count,
    fragmentation
  };
};

const getDbInfos = () => {
  return request
    .post({
      url: `${environment.serverUrl}/_dbs_info`,
      json: true,
      body: { keys: Object.values(DBS_TO_MONITOR) },
      headers: { 'Content-Type': 'application/json' }
    })
    .then(dbInfos => {
      const result = {};
      dbInfos.forEach((dbInfo, i) => {
        result[Object.keys(DBS_TO_MONITOR)[i]] = mapDbInfo(dbInfo.info);
      });
      return result;
    });
};

const getOutboundPushQueueLength = () => {
  return db.sentinel
    .allDocs({
      startkey: 'task:outbound:',
      endkey: 'task:outbound:\ufff0'
    })
    .then(result => result.rows.length);
}

const getOutgoingMessageStatusCounts = () => {
  return db.medic.query('medic-admin/message_queue', { reduce: true, group_level: 1 })
    .then(counts => {
      const result = {
        due: 0,
        scheduled: 0,
        muted: 0
      }
      counts.rows.forEach(row => {
        result[row.key[0]] = row.value;
      })
      return result;
    });
};

const getFeedbackCount = () => {
  return db.medicUsersMeta.allDocs({
    startkey: 'feedback-',
    endkey: 'feedback-\ufff0',
    limit: 1,
    descending: true
  })
    .then(result => {
      console.log(result);
      return result.rows.length}
    ); // TODO probably need a view to do this better!
};

const fetch = () => {
  return Promise
    .all([
      getAppVersion(),
      getCouchVersion(),
      getDbInfos(),
      getSentinelProcessedSeq(),
      getOutboundPushQueueLength(),
      getOutgoingMessageStatusCounts(),
      getFeedbackCount()
    ])
    .then(([
      appVersion,
      couchVersion,
      dbInfos,
      sentinelProcessedSeq,
      outboundPushBacklog,
      outgoingMessageStatus,
      feedbackCount
    ]) => {
      return Promise.resolve({
        version: {
          app: appVersion,
          node: process.version,
          couchdb: couchVersion
        },
        couchdb: dbInfos,
        // date: {
        //   current: (new Date()).valueOf(),
        //   uptime: process.uptime()
        // },
        sentinel: {
          backlog: dbInfos.medic.update_sequence - sentinelProcessedSeq
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
        }
      });
    });
};

/// TODO kill the cache
const getFullInfo = () => {
  const cache = cacheService.instance(CACHE_NAME);
  const cached = cache.get(CACHE_KEY);
  if (cached) {
    return cached;
  }
  const promise = fetch();
  cache.set(CACHE_KEY, promise);
  return promise;
};

module.exports = {
  get: (req, res) => {
    return getFullInfo()
      .then(info => res.json(info))
      .catch(err => serverUtils.serverError(err, req, res));
  }
};
