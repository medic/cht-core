const request = require('@medic/couch-request');
const { performance } = require('perf_hooks');
const utils = require('./utils');
const { setTimeout: setTimeoutPromise } = require('node:timers/promises');

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

const ddoc = {
  _id: '_design/view_test',
  views: {
    test: {
      map: 'function(doc) { emit(doc._id, null); }'
    }
  }
};
const viewPath = `${ddoc._id}/_view/test`;
const docIds = [];

const populateDocIds = (response) => {
  if (docIds.length) {
    return;
  }

  const desiredLength = Math.max(
    ...scenarios
      .filter(scenario => scenario.keys)
      .map(scenario => scenario.limit)
  );
  if (response.rows.length === desiredLength) {
    docIds.push(...response.rows.map(row => row.key));
  }
};

const waitForIndexing = async () => {
  try {
    await request.get({ uri: `${utils.db}/${viewPath}`, qs: { limit: 1 } });
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
  const queryString = {
    include_docs: params.include_docs,
  };
  let method = 'get';
  const options = { uri: `${utils.db}/${viewPath}`, qs: queryString };

  if (params.keys) {
    options.body = { keys: docIds };
    method = 'post';
  }

  if (params.limit && !params.keys) {
    queryString.limit = params.limit;
  }

  const start = performance.now();
  const response = await request[method](options);
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
