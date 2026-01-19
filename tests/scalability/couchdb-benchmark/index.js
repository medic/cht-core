const { printResults, cleanFile, writeDbInfo } = require('./utils');

const testChanges = require('./changes');
const testAllDocs = require('./all_docs');
const testBulkGet = require('./bulk_get');
const testNouveauSearch = require('./nouveau_search');

(async () => {
  await cleanFile();
  await writeDbInfo();

  console.log('Starting CouchDB benchmark tests...\n');

  console.log('Running _changes tests...');
  await printResults('_changes', await testChanges());
  
  console.log('Running _all_docs tests...');
  await printResults('_all_docs', await testAllDocs());
  
  console.log('Running _bulk_get tests...');
  await printResults('_bulk_get', await testBulkGet());

  console.log('Running Nouveau search tests...');
  await printResults('_nouveau_search', await testNouveauSearch());

  console.log('\nBenchmark complete! Results written to benchmark_results.md');

  // benchmark db-doc get (with large attachments)
  // benchmark db-doc get (with large attachments got separately)
})();
