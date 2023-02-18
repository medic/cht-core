const utils = require('./utils');

const DOC_IDS_KEY = 'initial-replication-doc-ids';
const LAST_SEQ_KEY = 'initial-replication-last-seq';
const DOC_COUNT_KEY = 'initial-replication-doc-count';
const BATCH_SIZE = 100;

const getDocIds = async (setUiStatus) => {
  const res = await utils.fetchJSON('/initial-replication/get-ids');

  window.localStorage.setItem(DOC_IDS_KEY, res.doc_ids);
  window.localStorage.setItem(LAST_SEQ_KEY, res.last_seq);
  window.localStorage.setItem(DOC_COUNT_KEY, res.doc_ids.length);

  setUiStatus('FETCH_INFO', { count: 0, total: res.doc_ids.length });
};

const getDocsBatch = async (setUiStatus, remoteDb, localDb) => {
  const docIds = window.localStorage.getItem(DOC_IDS_KEY).split(',');
  const batch = docIds.splice(0, BATCH_SIZE);

  const requestDocs = { docs: batch.map(docId => ({ id: docId })), attachments: true };

  const res = await remoteDb.bulkGet(requestDocs);
  const docs = res.results
    .map(result => result.docs && result.docs[0] && result.docs[0].ok)
    .filter(doc => doc);
  await localDb.bulkDocs(docs, { new_edits: false });

  window.localStorage.setItem(DOC_IDS_KEY, docIds);
  return docIds.length;
};

const getDocs = async (setUiStatus, remoteDb, localDb) => {
  let remaining;
  const remoteDocCount = window.localStorage.getItem(DOC_COUNT_KEY);
  do {
    remaining = await getDocsBatch(setUiStatus, remoteDb, localDb);
    setUiStatus('FETCH_INFO', { count: remoteDocCount - remaining, total: remoteDocCount });
  } while (remaining > 0);
};

const writeCheckpointer = async (setUiStatus, remoteDb, localDb) => {
  const lastSeq = window.localStorage.getItem(LAST_SEQ_KEY);

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

const replicate = async (setUiStatus, remoteDb, localDb) => {
  setUiStatus('LOAD_APP');
  await getDocIds(setUiStatus);
  await getDocs(setUiStatus, remoteDb, localDb);
  await writeCheckpointer(setUiStatus, remoteDb, localDb);
};

module.exports = {
  replicate,
};
