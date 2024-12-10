const request = require('@medic/couch-request');
const moment = require('moment');

const db = require('../db');
const environment = require('@medic/environment');
const logger = require('@medic/logger');
const deployInfoService = require('./deploy-info');

const DBS_TO_MONITOR = {
  'medic': environment.db,
  'sentinel': environment.db + '-sentinel',
  'usersmeta': environment.db + '-users-meta',
  'users': '_users'
};

const VIEW_INDEXES_TO_MONITOR = {
  medic: [
    'medic',
    'medic-admin',
    'medic-client',
    'medic-conflicts',
    'medic-scripts',
    'medic-sms',
  ],
  sentinel: ['sentinel'],
  usersmeta: ['users-meta'],
  users: ['users'],
};

const NOUVEAU_INDEXES_TO_MONITOR = {
  medic: {
    'medic-nouveau': [
      'contacts_by_freetext',
      'reports_by_freetext',
    ],
  },
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

const sumArray = numbers => numbers.reduce((acc, curr) => acc + curr, 0);

const getFragmentation = ({ sizes }, viewIndexInfos) => {
  const activeSizes = [sizes, ...viewIndexInfos.map(({ view_index }) => view_index?.sizes)]
    .filter((sizes) => sizes && sizes.active > 0);
  if (activeSizes.length === 0) {
    return -1;
  }
  const totalActive = sumArray(activeSizes.map(({ active }) => active));
  const totalFile = sumArray(activeSizes.map(({ file }) => file));

  return totalFile / totalActive;
};

const mapDbInfo = (dbInfo, viewIndexInfos, nouveauIndexInfos) => {
  return {
    name: dbInfo.db_name || '',
    update_sequence: getSequenceNumber(dbInfo.update_seq),
    doc_count: defaultNumber(dbInfo.doc_count),
    doc_del_count: defaultNumber(dbInfo.doc_del_count),
    fragmentation: getFragmentation(dbInfo, viewIndexInfos),
    sizes: {
      active: defaultNumber(dbInfo.sizes?.active),
      file: defaultNumber(dbInfo.sizes?.file),
    },
    view_indexes: viewIndexInfos.map(viewIndexInfo => ({
      name: viewIndexInfo.name || '',
      sizes: {
        active: defaultNumber(viewIndexInfo.view_index?.sizes?.active),
        file: defaultNumber(viewIndexInfo.view_index?.sizes?.file),
      },
    })),
    nouveau_indexes: nouveauIndexInfos ? nouveauIndexInfos.map(nouveauIndexInfo => ({
      name: nouveauIndexInfo.name || '',
      update_sequence: nouveauIndexInfo.search_index.update_seq,
      num_docs: defaultNumber(nouveauIndexInfo.search_index.num_docs),
      disk_size: defaultNumber(nouveauIndexInfo.search_index.disk_size),
    })) : undefined,
  };
};

const fetchDbsInfo = () => request
  .post({
    url: `${environment.serverUrl}/_dbs_info`,
    json: true,
    body: { keys: Object.values(DBS_TO_MONITOR) },
    headers: { 'Content-Type': 'application/json' }
  })
  .then(response => response.map(({info}) => info))
  .catch(err => {
    logger.error('Error fetching db info: %o', err);
    return Object
      .keys(DBS_TO_MONITOR)
      .map(() => ({ }));
  });

const fetchViewIndexInfo = (db, designDoc) => request
  .get({
    url: `${environment.serverUrl}/${db}/_design/${designDoc}/_info`,
    json: true
  })
  .catch(err => {
    logger.error('Error fetching view index info: %o', err);
    return null;
  });

const fetchViewIndexInfosForDb = (db) => Promise.all(
  VIEW_INDEXES_TO_MONITOR[db].map(viewIndexName => fetchViewIndexInfo(DBS_TO_MONITOR[db], viewIndexName))
).then((viewIndexInfos) => viewIndexInfos.filter(info => info));

const fetchAllViewIndexInfos = () => Promise.all(Object.keys(VIEW_INDEXES_TO_MONITOR).map(fetchViewIndexInfosForDb));

const fetchNouveauIndexInfo = (db, designDoc, indexName) => request
  .get({
    url: `${environment.serverUrl}/${db}/_design/${designDoc}/_nouveau_info/${indexName}`,
    json: true
  })
  .catch(err => {
    logger.error('Error fetching nouveau index info: %o', err);
    return null;
  });

const fetchNouveauIndexInfosForDdoc = (db, ddoc) => NOUVEAU_INDEXES_TO_MONITOR[db][ddoc].map(
  indexName => fetchNouveauIndexInfo(DBS_TO_MONITOR[db], ddoc, indexName),
);

const fetchNouveauIndexInfosForDb = (db) => Promise.all(Object.keys(NOUVEAU_INDEXES_TO_MONITOR[db]).flatMap(
  ddoc => fetchNouveauIndexInfosForDdoc(db, ddoc),
));

const fetchAllNouveauIndexInfos = () => Promise.all(
  Object.keys(NOUVEAU_INDEXES_TO_MONITOR).map(fetchNouveauIndexInfosForDb),
);

const getDbInfos = async () => {
  const [dbInfos, viewIndexInfos, nouveauIndexInfos] = await Promise.all([
    fetchDbsInfo(),
    fetchAllViewIndexInfos(),
    fetchAllNouveauIndexInfos(),
  ]);
  // console.log("dbInfos", dbInfos);
  // console.log("viewIndexInfos", viewIndexInfos);
  // console.log("nouveauInfos", nouveauIndexInfos);
  const result = {};
  Object.keys(DBS_TO_MONITOR).forEach((dbKey, i) => {
    // console.log("dbInfos[i]", dbInfos[i]);
    // console.log("viewIndexInfos[i]", viewIndexInfos[i]);
    result[dbKey] = mapDbInfo(dbInfos[i], viewIndexInfos[i], nouveauIndexInfos[i]);
  });
  // console.log("result", result);
  return result;
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
