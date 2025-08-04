const db = require('../db');
const BATCH_SIZE = 100;

const removeLanguage = (docs) => {
  docs.forEach(doc => delete doc.language);
  return db.medic.bulkDocs(docs);
};

const needsUpdate = (row) => row.doc && Object.prototype.hasOwnProperty.call(row.doc, 'language');

const removeLanguageFromUserSettings = async (skipSize) => {
  const results = await db.medic.allDocs({
    startkey: 'org.couchdb.user:',
    endkey: 'org.couchdb.user:\uffff',
    limit: BATCH_SIZE,
    skip: skipSize,
    include_docs: true
  });

  if (!results.rows.length) {
    return;
  }

  const docsWithLanguage = results.rows.filter(needsUpdate).map(row => row.doc);
  if (docsWithLanguage.length) {
    await removeLanguage(docsWithLanguage);
  }

  return removeLanguageFromUserSettings(skipSize + BATCH_SIZE);
};

module.exports = {
  name: 'remove-user-language',
  created: new Date(2021, 6, 1, 0, 0, 0, 0),
  run: () => removeLanguageFromUserSettings(0)
};
