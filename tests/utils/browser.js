const fs = require('fs');
const feedBackDocs = async (testName = 'allLogs', existingDocIds = []) => {
  const feedBackDocs = await browser.executeAsync(feedBackDocsScript);
  const flattened = feedBackDocs.flat();
  const newDocIds = flattened.map(doc => existingDocIds.indexOf(doc.id) === -1);
  if (newDocIds && newDocIds.length > 0) {
    fs.writeFileSync(`./tests/logs/feedbackDocs-${testName}.json`, JSON.stringify(flattened, null, 2));
    return flattened.map(doc => doc.id);
  }
};

const feedBackDocsScript = async (done) => {
  // sometimes tests end when the user is _not_ on an angular page
  // eslint-disable-next-line no-undef
  if (!window.PouchDB) {
    return done(Promise.resolve([]));
  }
  // This is running inside the browser. indexedDB and PouchDB is available there.
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

const getCookies = (...cookieNameList) => {
  return browser.getCookies(cookieNameList);
};

module.exports = {
  feedBackDocs,
  getCookies
};
