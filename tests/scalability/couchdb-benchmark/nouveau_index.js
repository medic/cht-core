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
      await createAndIndexView();
    } else {
      throw e;
    }
  }
};

const createAndIndexView = async () => {
  const options = { uri: `${utils.db}/${ddoc._id}`, body: ddoc };
  await request.put(options);
  await waitForIndexing();
};


const test = async (params) => {
  const method = 'post';
  const options = {
    uri: `${utils.db}/${indexPath}`,
    body: {
      include_docs: params.include_docs,
      q: '*:*',
      limit: params.limit,
    }
  };

  if (params.keys) {
    if (params.limit > MAX_KEYS) {
      const body = { ...options.body };
      const docIdsCopy = [...docIds];
      options.body = [];

      while (docIdsCopy.length) {
        options.body.push({
          ...body,
          q: `id:(${docIdsCopy.splice(0, MAX_KEYS).map(nouveau.escapeKeys).join(' OR ')})`
        });
      }
    } else {
      options.body.q = `id:(${docIds.slice(0, params.limit).map(nouveau.escapeKeys).join(' OR ')})`;
    }
  }

  let response;
  const start = performance.now();
  if (Array.isArray(options.body)) {
    for (const body of options.body) {
      response = await request[method]({ ...options, body });
    }
  } else {
    response = await request[method](options);
  }

  const end = performance.now();

  populateDocIds(response);

  return parseInt(end - start);
};

module.exports = async () => {
  await createAndIndexView();

  const results = [];
  for (const scenario of scenarios) {
    const duration = await test(scenario);
    results.push({ scenario, duration });
  }
  return results;
};
