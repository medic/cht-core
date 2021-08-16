const fs = require('fs');
const feedBackDocs = async (testName = 'allLogs') => {
  const feedBackDocs = await browser.executeAsync(feedBackDocsScript);
  if (feedBackDocs && feedBackDocs.flat().length > 0) {
    fs.writeFileSync(`./tests/logs/feedbackDocs-${testName}.txt`, JSON.stringify(feedBackDocs, null, 2));
    return true;
  }
};


const feedBackDocsScript = async (done) => {
  //This is running inside the browser. indexedDB and PouchDB is available there.
  // eslint-disable-next-line no-undef
  const allDbList = await indexedDB.databases();
  const metaDbList = allDbList.filter(db => db.name.includes('pouch_medic-user') && db.name.endsWith('-meta'));
  done(Promise.all(metaDbList.map(async (db) => {
    const nameStripped = db.name.replace('_pouch_', '');
    // eslint-disable-next-line no-undef
    const metaDb = new PouchDB(nameStripped);
    const docs = await metaDb.allDocs({ include_docs: true, startkey: 'feedback-', endkey: 'feedback-\ufff0' });
    return docs.rows;
  })));
};

module.exports = {
  feedBackDocs
};
