const utils = require('../../utils'),
      querystring = require('querystring'),
      constants = require('../../constants');

// This function resolves after Sentinel has processed required all docs (matched by provided docIds).
// We achieve this by getting the last seq that sentinel has processed, querying the main db's changes feed,
// filtering by the provided ids and using Sentinel's processed_seq as a since param - simulating what Sentinel's
// queue would be like. If we receive no results, we are finished. If we receive results, we try again in 100ms.
// We use the timeout because local docs don't appear on the changes feed, otherwise we could `longpoll` it instead.
const waitForSentinel = docIds => {
  return requestOnSentinelTestDb('/_local/sentinel-meta-data')
    .then(metaData => metaData.processed_seq)
    .then(seq => {
      const opts = {
        path: '/_changes?' + querystring.stringify({ since: seq, filter: '_doc_ids' }),
        body: { doc_ids: Array.isArray(docIds) ? docIds : [docIds] },
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
      };
      return utils.requestOnTestDb(opts);
    })
    .then(response => {
      if (response.results && !response.results.length) {
        // sentinel has caught up and processed our doc
        return;
      }

      return new Promise(resolve => {
        setTimeout(() => waitForSentinel(docIds).then(resolve), 100);
      });
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

module.exports = {
  waitForSentinel: waitForSentinel,
  requestOnSentinelTestDb: requestOnSentinelTestDb,
  getInfoDoc: getInfoDoc,
  getInfoDocs: getInfoDocs
};
