const request = require('@medic/couch-request');
const { performance } = require('perf_hooks');
const utils = require('./utils');

const docIds = [];

const scenarios = [
  { count: 100 },
  { count: 1000 },
  { count: 10000 },
];

const test = async (scenario) => {
  const ids = docIds.slice(0, scenario.count);
  const payload = ids.map(id => ({ id }));

  const start = performance.now();
  await request.post({ uri: `${utils.db}/_bulk_get`, body: { docs: payload } });
  const end = performance.now();

  return parseInt(end - start);
};

const getDocIds = async () => {
  const maxDocs = Math.max(...scenarios.map(scenario => scenario.count));
  const response = await request.get({ uri: `${utils.db}/_all_docs`, qs: { limit: maxDocs, skip: maxDocs * 10 } });
  docIds.push(...response.rows.map(row => row.id));
};

module.exports = async () => {
  await getDocIds();

  const results = [];
  for (const scenario of scenarios) {
    const duration = await test(scenario);
    results.push({ scenario, duration });
  }
  return results;
};
