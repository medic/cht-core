const request = require('@medic/couch-request');
const { performance } = require('perf_hooks');
const utils = require('./utils');
const { setTimeout: setTimeoutPromise } = require('node:timers/promises');
const nouveau = require('@medic/nouveau');

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
      index: 'function(doc) { index("string", "_id", doc._id, {"store": true}); }'
    }
  }
};
const indexPath = `${ddoc._id}/_nouveau/test`;

const populateDocIds = (response) => {
  if (docIds.length) {
    return;
  }

  const desiredLength = scenarios.find(scenario => scenario.keys).limit;
  if (response.rows.length === desiredLength) {
    docIds.push(...response.rows.map(row => row.id));
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
    uri: `${utils.db}/${indexPath}`, body: {
      include_docs: params.include_docs,
      q: '_id:*',
    }
  };

  if (params.keys) {
    options.body.q = `_id:(${docIds.map(nouveau.escapeKeys).join(' OR ')})`;
  }

  if (params.limit) {
    options.body.limit = params.limit;
  }

  const start = performance.now();
  const response = await request[method](options);
  const end = performance.now();

  populateDocIds(response);

  return parseInt(end - start);
};

module.exports = async () => {
  await createAndIndexView();
  await populateDocIds();

  const results = [];
  for (const scenario of scenarios) {
    const duration = await test(scenario);
    results.push({ scenario, duration });
  }
  return results;
};
