const utils = require('./utils');
const translator = require('./translator');
const { setUiStatus } = require('./ui-status');

let docIdsRevs;
let lastSeq;
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

const displayTooManyDocsWarning = ({ warn_docs, limit }) => {
  return new Promise(resolve => {
    const translateParams = { count: warn_docs, limit: limit };
    const errorMessage = translator.translate('TOO_MANY_DOCS', translateParams);
    const continueBtn = translator.translate('CONTINUE');
    const abort = translator.translate('ABORT');
    const content = `
            <div>
              <p class="alert alert-warning">${errorMessage}</p>
              <a id="btn-continue" class="btn btn-primary pull-left" href="#">${continueBtn}</a>
              <a id="btn-abort" class="btn btn-danger pull-right" href="#">${abort}</a>
            </div>`;

    $('.bootstrap-layer .loader, .bootstrap-layer .status').hide();
    $('.bootstrap-layer .error').show();
    $('.bootstrap-layer .error').html(content);
    $('#btn-continue').click(() => resolve());
    $('#btn-abort').click(() => {
      document.cookie = 'login=force;path=/';
      window.location.reload(false);
    });
  });
};

const getMissingDocIdsRevsPairs = async (localDb, remoteDocIdsRevs) => {
  const localDocs = await getLocalDocList(localDb);
  return remoteDocIdsRevs.filter(({ id, rev }) => !localDocs[id] || localDocs[id] !== rev);
};

const getDownloadList = async (localDb) => {
  const response = await utils.fetchJSON('/initial-replication/get-ids');

  docIdsRevs = await getMissingDocIdsRevsPairs(localDb, response.doc_ids_revs);
  lastSeq = response.last_seq;
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

  const res = await remoteDb.bulkGet({ docs: batch, attachments: true });
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
  const replicateFromPromise = localDb.replicate.from(remoteDb, {
    live: false,
    retry: false,
    heartbeat: 10000,
    timeout: 1000 * 60 * 10, // try for ten minutes then give up,
    query_params: { initial_replication: true },
    since: lastSeq,
  });

  replicateFromPromise.on('change', () => replicateFromPromise.cancel());
  await replicateFromPromise;

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
  const errors = results.rows.filter(row => row.error);
  const hasRequiredDocs = !errors.length;

  const replicationLog = await getReplicationLog(localDb);

  if (!hasRequiredDocs) {
    return true;
  }

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
