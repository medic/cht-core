const { printResults, cleanFile, writeDbInfo } = require('./utils');

const testChanges = require('./changes');
const testAllDocs = require('./all_docs');

(async () => {
  await cleanFile();
  await writeDbInfo();

  await printResults('_changes', await testChanges());
  await printResults('_all_docs', await testAllDocs());

  // benchmark _bulk_get
  // benchmark db-doc get (with large attachments)
  // benchmark db-doc get (with large attachments got separately)
})();
