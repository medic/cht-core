const utils = require('../../utils');
const querystring = require('querystring');
const constants = require('../../constants');
const _ = require('lodash');

const SKIPPED_BY_SENTINEL = /^_design\/|(-info|____tombstone)$/;

//
// Waits for a procedure that logs its progress to a metadata document (such as sentinel
// transitions) to catch up, either to now, or far enough that it has processed all passed docIds.
//
// @param      {<string>}         metadataId  document that stores the seq, see the metadata library
// @param      {<array[string]>}  docIds    documents that must be processed before returning
// @return     {<promise>}        resolves once the wait is over
//
const waitForSeq = (metadataId, docIds) => {
  utils.deprecated('waitForSeq','waitForSeqNative');
  return requestOnSentinelTestDb(metadataId)
    .catch(err => {
      if (err.statusCode === 404) { // maybe Sentinel hasn't started yet
        return { value: 0 };
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

const waitForSeqNative = (metadataId, docIds) => {
  return requestOnSentinelTestDbNative(metadataId)
    .catch(err => {
      if (err.statusCode === 404) { // maybe Sentinel hasn't started yet
        return { value: 0 };
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
        opts.body = { doc_ids: _.castArray(docIds) };
      } else {
        opts.path = `${opts.path}?${querystring.stringify({ since: seq })}`;
      }
      return utils.requestOnTestDbNative(opts);
    })
    .then(response => {
      // sentinel doesn't bump the `transitions_seq` in it's metadata doc when a change it ignores comes in
      // so we ignore those too
      if (!response.results.length || response.results.every(change => SKIPPED_BY_SENTINEL.test(change.id))) {
        // sentinel has caught up and processed our doc
        return;
      }

      return utils.delayPromise(() => waitForSeqNative(metadataId, docIds), 100);
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

const requestOnSentinelTestDbNative = (options) => {
  if (typeof options === 'string') {
    options = {
      path: options,
    };
  }
  options.path = '/' + constants.DB_NAME + '-sentinel' + (options.path || '');
  return utils.requestNative(options);
};


const getInfoDoc = docId => {
  return requestOnSentinelTestDb('/' + docId + '-info');
};

const getInfoDocs = (docIds = []) => {
  utils.deprecated('getInfoDocs','getInfoDocsNative');
  docIds = _.castArray(docIds);

  const opts = {
    path: '/_all_docs?include_docs=true',
    body: { keys: docIds.map(id => `${id}-info`) },
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
  };
  return requestOnSentinelTestDb(opts).then(response => response.rows.map(row => row.doc));
};

const getInfoDocsNative = async (docIds = []) => {
  docIds = _.castArray(docIds);
  const opts = {
    path: '/_all_docs?include_docs=true',
    body: { keys: docIds.map(id => id + '-info') },
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
  };
  const response = await requestOnSentinelTestDbNative(opts);
  return response.rows.map(row => row.doc);
};

const deletePurgeDbs = () => {
  return getPurgeDbs().then(dbs => {
    return Promise.all(dbs.map(db => utils.request({ path: `/${db}`, method: 'DELETE' })));
  });
};

const deletePurgeDbsNative = async () => {
  const dbs = await getPurgeDbsNative();
  return dbs.map(async db => await utils.requestNative({ path: `/${db}`, method: 'DELETE' }));
};

const getPurgeDbs = () => {
  const options = {
    path: '/_all_dbs'
  };
  return utils.request(options).then(dbs => {
    return dbs.filter(db => db.startsWith(`${constants.DB_NAME}-purged-role-`));
  });
};

const getPurgeDbsNative = async () => {
  const options = {
    path: '/_all_dbs'
  };
  const dbs = await utils.requestNative(options);
  return dbs.filter(db => db.startsWith(`${constants.DB_NAME}-purged-role-`));
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

const waitForPurgeCompletionNative = async seq => {
  const params = {
    since: seq,
    feed: 'longpoll',
  };
  const result = await requestOnSentinelTestDbNative('/_changes?' + querystring.stringify(params));
  if (result.results && result.results.find(change => change.id.startsWith('purgelog:'))) {
    return;
  }
  waitForPurgeCompletionNative(result.last_seq);
};

const getCurrentSeq = () => requestOnSentinelTestDb('').then(data => data.update_seq);
const getCurrentSeqNative = async () => { 
  const data = await requestOnSentinelTestDbNative('');
  return data.update_seq;
};

module.exports = {
  waitForSentinel: docIds => waitForSeq('/_local/transitions-seq', docIds),
  waitForSentinelNative: docIds => waitForSeqNative('/_local/transitions-seq', docIds),
  waitForBackgroundCleanup: docIds => waitForSeq('/_local/background-seq', docIds),
  requestOnSentinelTestDb: requestOnSentinelTestDb,
  getInfoDoc: getInfoDoc,
  getInfoDocs: getInfoDocs,
  getInfoDocsNative:getInfoDocsNative,
  deletePurgeDbs: deletePurgeDbs,
  deletePurgeDbsNative,
  waitForPurgeCompletion: waitForPurgeCompletion,
  waitForPurgeCompletionNative,
  getCurrentSeq: getCurrentSeq,
  getCurrentSeqNative,
  getPurgeDbs: getPurgeDbs,
};
