const { printResults, cleanFile, writeDbInfo } = require('./utils');

const testChanges = require('./changes');
const testAllDocs = require('./all_docs');
const testBulkGet = require('./bulk_get');

const testView = require('./view');
const testNouveauIndex = require('./nouveau_index');

(async () => {
  await cleanFile();
  await writeDbInfo();

  await printResults('_changes', await testChanges());
  await printResults('_all_docs', await testAllDocs());
  await printResults('_bulk_get', await testBulkGet());

  // benchmark db-doc get (with large attachments)
  // benchmark db-doc get (with large attachments got separately)

  await printResults('view', await testView());
  await printResults('nouveau_index', await testNouveauIndex());
})();
