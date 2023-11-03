const utils = require('@utils');
const querystring = require('querystring');
const constants = require('@constants');
const _ = require('lodash');

const SKIPPED_BY_SENTINEL = /^_design\/|(-info|____tombstone)$/;
const TRANSITION_SEQ = '_local/transitions-seq';
const BACKGROUND_SEQ = '_local/background-seq';

//
// Waits for a procedure that logs its progress to a metadata document (such as sentinel
// transitions) to catch up, either to now, or far enough that it has processed all passed docIds.
//
// @param      {<string>}         metadataId  document that stores the seq, see the metadata library
// @param      {<array[string]>}  docIds    documents that must be processed before returning
// @return     {<promise>}        resolves once the wait is over
//
const waitForSeq = (metadataId, docIds) => {
  return utils.sentinelDb
    .get(metadataId)
    .catch(err => {
      if (err.statusCode === 404) { // maybe Sentinel hasn't started yet
        return { value: 0 };
      }
      throw err;
    })
    .then(metaData => metaData.value)
    .then(seq => {
      const opts = { path: '/_changes' };
      if (docIds) {
        opts.path = `${opts.path}?${querystring.stringify({ since: seq, filter: '_doc_ids' })}`;
        opts.method = 'POST';
        opts.body = { doc_ids: _.castArray(docIds) };
      } else {
        opts.path = `${opts.path}?${querystring.stringify({ since: seq })}`;
      }
      return utils.requestOnTestDb(opts);
    })
    .then(response => {
      // sentinel doesn't bump the `transitions_seq` in it's metadata doc when a change it ignores comes in
      // so we ignore those too
      if (!response.results.length || response.results.every(change => SKIPPED_BY_SENTINEL.test(change.id))) {
        // sentinel has caught up and processed our doc
        return;
      }

      return utils.delayPromise(() => waitForSeq(metadataId, docIds), 100);
    });
};

const getInfoDoc = async (docId) => {
  return await utils.requestOnSentinelTestDb('/' + docId + '-info');
};

const getInfoDocs = async (docIds = []) => {
  docIds = _.castArray(docIds);

  const opts = {
    path: '/_all_docs?include_docs=true',
    body: { keys: docIds.map(id => `${id}-info`) },
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
  };

  const response = await utils.requestOnSentinelTestDb(opts);
  return response.rows.map(row => row.doc);
};

const deletePurgeDbs = () => {
  return getPurgeDbs().then(dbs => {
    return Promise.all(dbs.map(db => utils.request({ path: `/${db}`, method: 'DELETE' })));
  });
};

const getPurgeDbs = () => {
  const options = {
    path: '/_all_dbs'
  };
  return utils.request(options).then(dbs => {
    return dbs.filter(db => db.startsWith(`${constants.DB_NAME}-purged-role-`));
  });
};

const waitForPurgeCompletion = async (seq) => {
  const waitForWipe = await utils.waitForApiLogs(/Wiping purged docs cache/);
  await waitForPurgeLog(seq);
  await waitForWipe.promise;
};

const waitForPurgeLog = seq => {
  const params = {
    since: seq,
    feed: 'longpoll',
  };
  return utils.requestOnSentinelTestDb('/_changes?' + querystring.stringify(params))
    .then(result => {
      if (result.results && result.results.find(change => change.id.startsWith('purgelog:'))) {
        return;
      }

      return waitForPurgeLog(result.last_seq);
    });
};

const getCurrentSeq = () => utils.sentinelDb.info().then(data => data.update_seq);
const getBacklogCount = () => {
  return utils.sentinelDb.get(TRANSITION_SEQ)
    .then(metadata => utils.request({ path: '/medic/_changes', qs: { limit: 0, since: metadata.value } }))
    .then(result => result.pending);
};

const skipToSeq = async (seq) => {
  if (!seq) {
    const info = await utils.db.info();
    seq = info.update_seq;
  }
  const backlogDoc = await utils.sentinelDb.get(TRANSITION_SEQ);
  backlogDoc.value = seq;
  await utils.sentinelDb.put(backlogDoc);
};

module.exports = {
  waitForSentinel: docIds => waitForSeq(TRANSITION_SEQ, docIds),
  waitForBackgroundCleanup: docIds => waitForSeq(BACKGROUND_SEQ, docIds),
  requestOnSentinelTestDb: utils.requestOnSentinelTestDb,
  getInfoDoc: getInfoDoc,
  getInfoDocs: getInfoDocs,
  deletePurgeDbs: deletePurgeDbs,
  waitForPurgeCompletion: waitForPurgeCompletion,
  getCurrentSeq: getCurrentSeq,
  getPurgeDbs: getPurgeDbs,
  getBacklogCount: getBacklogCount,
  skipToSeq: skipToSeq,
};
