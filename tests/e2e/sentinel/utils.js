const utils = require('../../utils');
const querystring = require('querystring');
const constants = require('../../constants');

const SKIPPED_BY_SENTINEL = /^_design\/|(-info|____tombstone)$/;

// This function resolves after Sentinel has processed all required docs (matched by provided docIds).
// We achieve this by getting the last seq that sentinel has processed, querying the main db's changes feed,
// filtering by the provided ids and using Sentinel's transitions_seq as a since param - simulating what Sentinel's
// queue would be like. If we receive no results, we are finished. If we receive results, we try again in 100ms.
// We use the timeout because local docs don't appear on the changes feed, otherwise we could `longpoll` it instead.
// If no docIds are provided, we will query the main db's changes feed with the `since` param equal to sentinel's
// `transitions_seq`. When we don't receive any changes, it means Sentinel has caught up. This is useful when testing
// api SMS endpoints that generated docs with ids we do not know.
const waitForSentinel = docIds => {
  return requestOnSentinelTestDb('/_local/transitions-seq')
    .catch(err => {
      if (err.statusCode === 404) { // maybe Sentinel hasn't started yet
        return { transitions_seq: 0 };
      }
      throw err;
    })
    .then(metaData => metaData.value)
    .then(seq => {
      const opts = {
        path: '/_changes',
        headers: { 'Content-Type': 'application/json' },
      };
      if (docIds) {
        opts.path = `${opts.path}?${querystring.stringify({ since: seq, filter: '_doc_ids' })}`;
        opts.method = 'POST';
        opts.body = { doc_ids: Array.isArray(docIds) ? docIds : [ docIds ] };
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

      return utils.delayPromise(() => waitForSentinel(docIds), 100);
    });
};

const requestOnSentinelTestDb = (options) => {
  if (typeof options === 'string') {
    options = {
      path: options,
    };
  }
  options.path = '/' + constants.DB_NAME + '-sentinel' + (options.path || '');
  return utils.request(options);
};

const getInfoDoc = docId => {
  return requestOnSentinelTestDb('/' + docId + '-info');
};

const getInfoDocs = (docIds = []) => {
  docIds = Array.isArray(docIds) ? docIds : [docIds];

  const opts = {
    path: '/_all_docs?include_docs=true',
    body: { keys: docIds.map(id => id + '-info') },
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
  };
  return requestOnSentinelTestDb(opts).then(response => response.rows.map(row => row.doc));
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

const waitForPurgeCompletion = seq => {
  const params = {
    since: seq,
    feed: 'longpoll',
  };
  return requestOnSentinelTestDb('/_changes?' + querystring.stringify(params))
    .then(result => {
      if (result.results && result.results.find(change => change.id.startsWith('purgelog:'))) {
        return;
      }

      return waitForPurgeCompletion(result.last_seq);
    });
};

const getCurrentSeq = () => requestOnSentinelTestDb('').then(data => data.update_seq);

module.exports = {
  waitForSentinel: waitForSentinel,
  requestOnSentinelTestDb: requestOnSentinelTestDb,
  getInfoDoc: getInfoDoc,
  getInfoDocs: getInfoDocs,
  deletePurgeDbs: deletePurgeDbs,
  waitForPurgeCompletion: waitForPurgeCompletion,
  getCurrentSeq: getCurrentSeq,
  getPurgeDbs: getPurgeDbs,
};
