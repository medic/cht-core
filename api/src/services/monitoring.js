const request = require('request-promise-native');

const db = require('../db');
const environment = require('../environment');

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
};

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
    .then(result => result.rows.length); // TODO use a view
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
      return result.rows.length;
    }); // TODO probably need a view to do this better!
};

const json = () => {
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
        date: {
          current: (new Date()).valueOf(),
          uptime: process.uptime()
        },
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

const openMetricsDbBlock = (info, dbName) => {
  return `
# HELP couchdb_${dbName}_doc_count The number of docs in the ${dbName} db
# TYPE couchdb_${dbName}_doc_count gauge
couchdb_${dbName}_doc_count ${info.couchdb[dbName].doc_count}

# HELP couchdb_${dbName}_doc_del_count The number of deleted docs in the ${dbName} db
# TYPE couchdb_${dbName}_doc_del_count gauge
couchdb_${dbName}_doc_del_count ${info.couchdb[dbName].doc_del_count}

# HELP couchdb_${dbName}_fragmentation The fragmentation of the ${dbName} db, lower is better, "1" is no fragmentation
# TYPE couchdb_${dbName}_fragmentation gauge
couchdb_${dbName}_fragmentation ${info.couchdb[dbName].fragmentation}

# HELP couchdb_${dbName}_update_seq The number of changes in the ${dbName} db
# TYPE couchdb_${dbName}_update_seq counter
couchdb_${dbName}_update_seq ${info.couchdb[dbName].update_sequence}
`;
};

const getDbOutput = info => {
  return Object.keys(info.couchdb)
    .map(dbName => openMetricsDbBlock(info, dbName))
    .join('');
};

const getMessagingOutput = info => {
  return Object.entries(info.messaging.outgoing.state)
    .map(([state, value]) => {
      return `
# HELP messaging_outgoing Messages in each state
# TYPE messaging_outgoing gauge
messaging_outgoing{state="${state}"} ${value}
`;
    })
    .join('');
};

const getSentinelOutput = info => {
  return `
# HELP sentinel_backlog Number of changes yet to be processed by Sentinel
# TYPE sentinel_backlog gauge
sentinel_backlog ${info.sentinel.backlog}
`;
};

const getOutboundPushOutput = info => {
  return `
# HELP outbound_push_backlog Number of changes yet to be sent by Outbound Push
# TYPE outbound_push_backlog gauge
outbound_push_backlog ${info.outbound_push.backlog}
`;
};

const getFeedbackOutput = info => {
  return `
# HELP feedback_doc Number of feedback docs being created indicative of client side errors
# TYPE feedback_doc count
feedback_doc ${info.feedback.count}
`;
};

const convertToOpenMetrics = info => {
  return [
    getDbOutput(info),
    getMessagingOutput(info),
    getSentinelOutput(info),
    getOutboundPushOutput(info),
    getFeedbackOutput(info)
  ].join('');
};

module.exports = {
  json,
  openMetrics: () => {
    return json().then(json => convertToOpenMetrics(json));
  }
};
