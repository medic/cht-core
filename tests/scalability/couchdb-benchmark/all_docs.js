const request = require('@medic/couch-request');
const { performance } = require('perf_hooks');
const utils = require('./utils');

const YES = 'Yes';

const scenarios = [
  { limit: 100, include_docs: false },
  { limit: 1000, include_docs: false },
  { limit: 10000, include_docs: false },

  { limit: 100, include_docs: true },
  { limit: 1000, include_docs: true },
  { limit: 10000, include_docs: true },

  { limit: 10000, keys: YES, include_docs: false },
  { limit: 10000, keys: YES, include_docs: true },
];

const docIds = [];

const populateDocIds = (response) => {
  if (docIds.length) {
    return;
  }

  const desiredLength = scenarios.find(scenario => scenario.keys).limit;
  if (response.rows.length === desiredLength) {
    docIds.push(...response.rows.map(row => row.id));
  }
};

const test = async (params) => {
  const queryString = {
    include_docs: params.include_docs,
  };
  let method = 'get';
  const options = { uri: `${utils.db}/_all_docs`, qs: queryString };

  if (params.keys) {
    options.body = { keys: docIds };
    method = 'post';
  }

  if (params.limit) {
    queryString.limit = params.limit;
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
