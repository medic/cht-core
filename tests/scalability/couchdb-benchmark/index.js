const { printResults, cleanFile, writeDbInfo } = require('./utils');

const testChanges = require('./changes');
const testAllDocs = require('./all_docs');
const testBulkGet = require('./bulk_get');

(async () => {
  await cleanFile();
  await writeDbInfo();

  await printResults('_changes', await testChanges());
  await printResults('_all_docs', await testAllDocs());
  await printResults('_bulk_get', await testBulkGet());

  // benchmark db-doc get (with large attachments)
  // benchmark db-doc get (with large attachments got separately)
})();
