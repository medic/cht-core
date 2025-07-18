const request = require('@medic/couch-request');
const { performance } = require('perf_hooks');
const utils = require('./utils');

const MID_SEQ = 'Mid Sequence';
const YES = 'true';

const scenarios = [
  { limit: 100, since: 0, include_docs: false },
  { limit: 1000, since: 0, include_docs: false },
  { limit: 10000, since: 0, include_docs: false },

  { limit: 100, since: 0, include_docs: true },
  { limit: 1000, since: 0, include_docs: true },
  { limit: 10000, since: 0, include_docs: true },

  { limit: 100, since: 0, include_docs: false, seq_interval: 100 },
  { limit: 1000, since: 0, include_docs: false, seq_interval: 1000 },
  { limit: 10000, since: 0, include_docs: false, seq_interval: 10000 },

  { limit: 100, since: MID_SEQ, include_docs: false },
  { limit: 1000, since: MID_SEQ, include_docs: false },
  { limit: 10000, since: MID_SEQ, include_docs: false },

  { limit: 100, since: MID_SEQ, include_docs: true },
  { limit: 1000, since: MID_SEQ, include_docs: true },
  { limit: 10000, since: MID_SEQ, include_docs: true },

  { limit: 100, since: MID_SEQ, include_docs: false, seq_interval: 100 },
  { limit: 1000, since: MID_SEQ, include_docs: false, seq_interval: 1000 },
  { limit: 10000, since: MID_SEQ, include_docs: false, seq_interval: 10000 },

  { limit: 10000, keys: YES, include_docs: false },
  { limit: 10000, keys: YES, include_docs: true },
  { limit: 10000, keys: YES, include_docs: false, seq_interval: 10000 },
];

const docIds = [];
let midSeq = '';

const getMidSeq = async () => {
  if (midSeq) {
    return midSeq;
  }

  const response = await request.get({ uri: `${utils.db}/_changes?limit=20000&seq_interval=200000` });
  midSeq = response.last_seq;
  return midSeq;
};

const populateDocIds = (response) => {
  if (docIds.length) {
    return;
  }

  const desiredLength = scenarios.find(scenario => scenario.keys).limit;
  if (response.results.length === desiredLength) {
    docIds.push(...response.results.map(row => row.id));
  }
};

const test = async (params) => {
  const queryString = {
    limit: params.limit,
    since: params.since,
    include_docs: params.include_docs,
  };
  let method = 'get';
  const options = { uri: `${utils.db}/_changes`, qs: queryString };

  if (params.keys === YES) {
    queryString.filter = '_doc_ids';
    delete queryString.since;
    delete queryString.limit;
    options.body = { doc_ids: docIds };
    method = 'post';
  }

  if (params.since === MID_SEQ) {
    queryString.since = await getMidSeq();
  }

  if (params.seq_interval) {
    queryString.seq_interval = params.seq_interval;
  }

  const start = performance.now();
  const response = await request[method](options);
  const end = performance.now();

  populateDocIds(response);

  return parseInt(end - start);
};

module.exports = async () => {
  const results = [];
  for (const scenario of scenarios) {
    const duration = await test(scenario);
    results.push({ scenario, duration });
  }
  return results;
};
