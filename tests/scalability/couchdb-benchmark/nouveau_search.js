const request = require('@medic/couch-request');
const { performance } = require('perf_hooks');
const utils = require('./utils');

const scenarios = [
  { query: 'key:_all', limit: 100, description: 'All docs - small limit' },
  { query: 'key:_all', limit: 1000, description: 'All docs - medium limit' },
  { query: 'key:_all', limit: 10000, description: 'All docs - large limit' },
  
  { query: 'type:person', limit: 100, description: 'Search persons - small' },
  { query: 'type:person', limit: 1000, description: 'Search persons - medium' },
  { query: 'type:data_record', limit: 100, description: 'Search reports - small' },
  { query: 'type:data_record', limit: 1000, description: 'Search reports - medium' },
];

let hasRunOnce = false;

const test = async (scenario) => {
  const queryParams = {
    q: scenario.query,
    limit: scenario.limit,
    include_docs: false, 
  };

  const designDoc = 'medic';
  const indexName = 'docs_by_replication_key';
  const uri = `${utils.db}/_design/${designDoc}/_nouveau/${indexName}`;

  try {
    const start = performance.now();
    const response = await request.get({ 
      uri, 
      qs: queryParams,
      json: true 
    });
    const end = performance.now();

    const duration = parseInt(end - start);
    const resultCount = response.total_rows || response.rows?.length || 0;

    return {
      duration,
      resultCount,
      indexType: hasRunOnce ? 'fresh' : 'first_run'
    };
  } catch (error) {
    console.error(`Error testing scenario: ${scenario.description}`, error.message);
    return {
      duration: -1,
      resultCount: 0,
      error: error.message,
      indexType: hasRunOnce ? 'fresh' : 'first_run'
    };
  }
};

const testWithDocs = async (scenario) => {
  const queryParams = {
    q: scenario.query,
    limit: Math.min(scenario.limit, 100),
    include_docs: true,
  };

  const designDoc = 'medic';
  const indexName = 'docs_by_replication_key';
  const uri = `${utils.db}/_design/${designDoc}/_nouveau/${indexName}`;

  try {
    const start = performance.now();
    await request.get({ 
      uri, 
      qs: queryParams,
      json: true 
    });
    const end = performance.now();

    return parseInt(end - start);
  } catch (error) {
    console.error(`Error testing scenario with docs: ${scenario.description}`, error.message);
    return -1;
  }
};

const checkNouveauAvailable = async () => {
  try {
    const designDoc = 'medic';
    const indexName = 'docs_by_replication_key';
    const uri = `${utils.db}/_design/${designDoc}/_nouveau/${indexName}`;
    
    await request.get({ 
      uri, 
      qs: { q: 'key:_all', limit: 1 },
      json: true 
    });
    return true;
  } catch (error) {
    console.error('Nouveau is not available or not configured:', error.message);
    return false;
  }
};

module.exports = async () => {
  const isAvailable = await checkNouveauAvailable();
  if (!isAvailable) {
    console.log('Skipping Nouveau tests - Nouveau search is not available or not configured');
    return [{
      scenario: { description: 'Nouveau not available' },
      duration: 'N/A',
      resultCount: 'N/A'
    }];
  }

  const results = [];

  console.log('Running Nouveau search tests without include_docs...');
  for (const scenario of scenarios) {
    const { duration, resultCount, indexType, error } = await test(scenario);
    results.push({ 
      scenario: {
        ...scenario,
        include_docs: false,
        indexType
      }, 
      duration: error ? `Error: ${error}` : duration,
      resultCount 
    });
  }

  hasRunOnce = true;

  console.log('Running Nouveau search tests with include_docs...');
  const withDocsScenarios = scenarios.slice(0, 4);
  for (const scenario of withDocsScenarios) {
    const duration = await testWithDocs(scenario);
    results.push({ 
      scenario: {
        ...scenario,
        include_docs: true,
        limit: Math.min(scenario.limit, 100)
      }, 
      duration: duration === -1 ? 'Error' : duration,
      resultCount: 'N/A'
    });
  }

  console.log('Re-running queries to test fresh index performance...');
  const freshIndexScenarios = scenarios.slice(0, 3);
  for (const scenario of freshIndexScenarios) {
    const { duration, resultCount } = await test(scenario);
    results.push({ 
      scenario: {
        ...scenario,
        description: `${scenario.description} (fresh index)`,
        include_docs: false,
        indexType: 'fresh'
      }, 
      duration,
      resultCount 
    });
  }

  return results;
};
