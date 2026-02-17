const request = require('@medic/couch-request');
const { performance } = require('perf_hooks');
const utils = require('./utils');
const { setTimeout: setTimeoutPromise } = require('node:timers/promises');
const nouveau = require('@medic/nouveau');

const MAX_KEYS = 1000;
const scenarios = [
  { limit: 100, include_docs: false },
  { limit: 1000, include_docs: false },
  { limit: 10000, include_docs: false },

  { limit: 100, include_docs: true },
  { limit: 1000, include_docs: true },
  { limit: 10000, include_docs: true },

  { limit: 100, keys: true, include_docs: false },
  { limit: 1000, keys: true, include_docs: false },
  { limit: 10000, keys: true, include_docs: false },
  { limit: 10000, keys: true, include_docs: true },
];

const docIds = [];
const ddoc = {
  _id: '_design/index_test',
  nouveau: {
    test: {
      default_analyzer: 'whitespace',
      field_analyzers: {
        exact_match: 'keyword'
      },
      index: 'function(doc) { index("string", "id", doc._id, {store: true}); }'
    }
  }
};
const indexPath = `${ddoc._id}/_nouveau/test`;

const populateDocIds = (response) => {
  if (docIds.length) {
    return;
  }

  const desiredLength = Math.max(
    ...scenarios
      .filter(scenario => scenario.keys)
      .map(scenario => scenario.limit)
  );
  if (response.hits.length === desiredLength) {
    docIds.push(...response.hits.map(row => row.id));
  }
};

const waitForIndexing = async () => {
  try {
    await request.get({ uri: `${utils.db}/${indexPath}`, qs: { limit: 1, q: '*:*' } });
  } catch (e) {
    const code = e.error?.code;
    if (code?.toUpperCase().includes('IMEDOUT')) {
      await setTimeoutPromise(1000);
      await waitForIndexing();
    } else {
      throw e;
    }
  }
};

const createAndIndexView = async () => {
  const options = { uri: `${utils.db}/${ddoc._id}`, body: ddoc };
  await request.put(options);
  const start = performance.now();
  await waitForIndexing();
  return performance.now() - start;
};


const test = async (params) => {
  const method = 'post';
  const body = {
    include_docs: params.include_docs,
    limit: params.limit,
    q: '*:*',
  };
  const uri = `${utils.db}/${indexPath}`;
  const requestOptions = [];

  if (params.keys) {
    if (params.limit > MAX_KEYS) {
      const docIdsCopy = [...docIds];
      while (docIdsCopy.length) {
        const q = `id:(${docIdsCopy.splice(0, MAX_KEYS).map(nouveau.escapeKeys).join(' OR ')})`;
        requestOptions.push({ uri, body: { ...body, q } });
      }
    } else {
      const q = `id:(${docIds.slice(0, params.limit).map(nouveau.escapeKeys).join(' OR ')})`;
      requestOptions.push({ uri, body: { ...body, q } });
    }
  } else {
    requestOptions.push({ uri, body });
  }

  let response;
  const start = performance.now();
  for (const options of requestOptions) {
    response = await request[method](options);
  }
  const end = performance.now();

  populateDocIds(response);

  return parseInt(end - start);
};

module.exports = async () => {
  const results = [];
  const indexingDuration = await createAndIndexView();
  results.push({ scenario: { limit: 'indexing' }, duration: indexingDuration });
  
  for (const scenario of scenarios) {
    const duration = await test(scenario);
    results.push({ scenario, duration });
  }
  return results;
};
