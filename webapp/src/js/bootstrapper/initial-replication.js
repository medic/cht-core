const utils = require('./utils');
const { setUiStatus, displayTooManyDocsWarning } = require('./ui-status');

let docIdsRevs;
let remoteDocCount;

const INITIAL_REPLICATION_LOG = '_local/initial-replication';
const BATCH_SIZE = 100;

const startInitialReplication = async (localDb) => {
  if (await getReplicationLog(localDb)) {
    return;
  }

  const log = {
    _id: INITIAL_REPLICATION_LOG,
    start_time: Date.now(),
    start_data_usage: getDataUsage(),
  };

  await localDb.put(log);
};

const completeInitialReplication = async (localDb) => {
  const dbSyncEndData = getDataUsage();

  const replicationLog = await getReplicationLog(localDb);
  if (!replicationLog) {
    throw new Error('Invalid replication state: missing replication log');
  }

  replicationLog.complete = true;
  replicationLog.duration =  Date.now() - replicationLog.start_time;
  replicationLog.data_usage = replicationLog.start_data_usage &&
                              dbSyncEndData.app.rx - replicationLog.start_data_usage.app.rx;

  console.info('Initial sync completed successfully in ' + (replicationLog.duration / 1000) + ' seconds');
  if (replicationLog.data_usage) {
    console.info('Initial sync received ' + replicationLog.data_usage + 'B of data');
  }

  await localDb.put(replicationLog);
};

const getDataUsage = () => {
  if (window.medicmobile_android && typeof window.medicmobile_android.getDataUsage === 'function') {
    return JSON.parse(window.medicmobile_android.getDataUsage());
  }
};

const getMissingDocIdsRevsPairs = async (localDb, remoteDocIdsRevs) => {
  const localDocs = await getLocalDocList(localDb);
  return remoteDocIdsRevs.filter(({ id, rev }) => !localDocs[id] || localDocs[id] !== rev);
};

const getDownloadList = async (localDb = true) => {
  const response = await utils.fetchJSON('/api/v1/initial-replication/get-ids');

  docIdsRevs = await getMissingDocIdsRevsPairs(localDb, response.doc_ids_revs);
  remoteDocCount = response.doc_ids_revs.length;

  if (response.warn) {
    await displayTooManyDocsWarning(response);
  }
};

const getLocalDocList = async (localDb) => {
  const response = await localDb.allDocs();

  const localDocMap = {};
  response.rows.forEach(row => localDocMap[row.id] = row.value && row.value.rev);
  return localDocMap;
};

const getDocsBatch = async (remoteDb, localDb) => {
  const batch = docIdsRevs.splice(0, BATCH_SIZE);

  if (!batch.length) {
    return;
  }

  const res = await remoteDb.bulkGet({ docs: batch, attachments: true, revs: true });
  const docs = res.results
    .map(result => result.docs && result.docs[0] && result.docs[0].ok)
    .filter(doc => doc);
  await localDb.bulkDocs(docs, { new_edits: false });
};

const downloadDocs = async (remoteDb, localDb) => {
  setUiStatus('FETCH_INFO', { count: remoteDocCount - docIdsRevs.length, total: remoteDocCount });
  do {
    await getDocsBatch(remoteDb, localDb);
    setUiStatus('FETCH_INFO', { count: remoteDocCount - docIdsRevs.length, total: remoteDocCount });
  } while (docIdsRevs.length > 0);
};

const writeCheckpointers = async (remoteDb, localDb) => {
  const localInfo = await localDb.info();
  await localDb.replicate.to(remoteDb, {
    since: localInfo.update_seq,
  });
};

const replicate = async (remoteDb, localDb) => {
  setUiStatus('LOAD_APP');

  await startInitialReplication(localDb);

  setUiStatus('POLL_REPLICATION');
  await getDownloadList(localDb);
  await downloadDocs(remoteDb, localDb);
  await writeCheckpointers(remoteDb, localDb);

  await completeInitialReplication(localDb);
};

const getReplicationLog = async (localDb) => {
  try {
    return await localDb.get(INITIAL_REPLICATION_LOG);
  } catch (err) {
    return null;
  }
};
const isReplicationNeeded = async (localDb, userCtx) => {
  const requiredDocs = [
    '_design/medic-client',
    'settings',
    `org.couchdb.user:${userCtx.name}`,
  ];
  const results = await localDb.allDocs({ keys: requiredDocs });
  const missingDocs = results.rows.some(row => row.error);

  if (missingDocs) {
    return true;
  }

  const replicationLog = await getReplicationLog(localDb);
  // new user who has started replicating, but did not complete
  if (replicationLog && !replicationLog.complete) {
    return true;
  }

  return false;
};

module.exports = {
  isReplicationNeeded,
  replicate,
};
