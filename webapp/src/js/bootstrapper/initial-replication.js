const utils = require('./utils');
const translator = require('./translator');
const { setUiStatus } = require('./ui-status');

let docIds;
let lastSeq;
let remoteDocCount;

const INITIAL_REPLICATION_LOG = '_local/initial-replication';
const BATCH_SIZE = 100;

const completeInitialReplication = async (localDb, dbSyncStartTime, dbSyncStartData) => {
  const duration = Date.now() - dbSyncStartTime;
  console.info('Initial sync completed successfully in ' + (duration / 1000) + ' seconds');
  const dbSyncEndData = getDataUsage();
  const dataUsage = dbSyncStartData && dbSyncEndData.app.rx - dbSyncStartData.app.rx;
  if (dataUsage) {
    console.info('Initial sync received ' + dataUsage + 'B of data');
  }

  const log = {
    _id: INITIAL_REPLICATION_LOG,
    data_usage: dataUsage,
    duration,
    start_time: dbSyncStartTime,
  };

  let replicationLog = await getReplicationLog(localDb);
  if (!replicationLog) {
    replicationLog = log;
  } else {
    replicationLog.history = replicationLog.history || [];
    replicationLog.history.push(replicationLog);
    replicationLog = { ...replicationLog, ...log };
  }

  await localDb.put(replicationLog);
};

const getDataUsage = () => {
  if (window.medicmobile_android && typeof window.medicmobile_android.getDataUsage === 'function') {
    return JSON.parse(window.medicmobile_android.getDataUsage());
  }
};

const getDocIds = async () => {
  const res = await utils.fetchJSON('/initial-replication/get-ids');
  docIds = res.doc_ids;
  lastSeq = res.last_seq;
  remoteDocCount = res.doc_ids.length;

  if (res.warn) {
    await new Promise(resolve => {
      const translateParams = { count: res.warn_docs, limit: res.limit };
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
  }

  setUiStatus('FETCH_INFO', { count: 0, total: res.doc_ids.length });
};

const getDocsBatch = async (remoteDb, localDb) => {
  const batch = docIds.splice(0, BATCH_SIZE);

  const byId = {};
  batch.forEach(({ id, rev }) => byId[id] = [rev]);
  const localRevs = await localDb.revsDiff(byId);

  const requestDocs = {
    docs: batch.filter(({ id }) => localRevs[id] && localRevs[id].missing && localRevs[id].missing.length),
    attachments: true
  };

  if (!requestDocs.docs.length) {
    return docIds.length;
  }

  const res = await remoteDb.bulkGet(requestDocs);
  const docs = res.results
    .map(result => result.docs && result.docs[0] && result.docs[0].ok)
    .filter(doc => doc);
  await localDb.bulkDocs(docs, { new_edits: false });

  return docIds.length;
};

const getDocs = async (remoteDb, localDb) => {
  let remaining;
  do {
    remaining = await getDocsBatch(remoteDb, localDb);
    setUiStatus('FETCH_INFO', { count: remoteDocCount - remaining, total: remoteDocCount });
  } while (remaining > 0);
};

const writeCheckpointer = async (remoteDb, localDb) => {
  await localDb.replicate.from(remoteDb, {
    live: false,
    retry: false,
    heartbeat: 10000,
    timeout: 1000 * 60 * 10, // try for ten minutes then give up,
    query_params: { initial_replication: true },
    since: lastSeq,
  });

  const localInfo = await localDb.info();
  await localDb.replicate.to(remoteDb, {
    since: localInfo.update_seq,
  });
};

const replicate = async (remoteDb, localDb) => {
  setUiStatus('LOAD_APP');

  const dbSyncStartTime = Date.now();
  const dbSyncStartData = getDataUsage();

  await getDocIds();
  await getDocs(remoteDb, localDb);
  await writeCheckpointer(remoteDb, localDb);

  await completeInitialReplication(localDb, dbSyncStartTime, dbSyncStartData);
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
  const replicationLog = await getReplicationLog(localDb);
  return errors.length || !replicationLog;
};

module.exports = {
  isReplicationNeeded,
  replicate,
};
