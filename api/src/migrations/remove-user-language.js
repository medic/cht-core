const db = require('../db');
const BATCH_SIZE = 100;

const removeLanguage = (docs) => {
  docs.forEach(doc => delete doc.language);
  return db.medic.bulkDocs(docs);
};

const needsUpdate = (row) => row.doc && Object.prototype.hasOwnProperty.call(row.doc, 'language');

const removeLanguageFromUserSettings = (skipSize) => {
  const options = {
    include_docs: true,
    limit: BATCH_SIZE,
    skip: skipSize,
    key: [ 'user-settings' ]
  };
  return db.medic
    .query('medic-client/doc_by_type', options)
    .then(result => {
      if (!result.rows || !result.rows.length) {
        return false;
      }
      const docsWithLanguage = result.rows.filter(needsUpdate).map(row => row.doc);
      if (!docsWithLanguage.length) {
        return true;
      }
      return removeLanguage(docsWithLanguage).then(() => true);
    })
    .then((moreRows) => moreRows && removeLanguageFromUserSettings(skipSize + BATCH_SIZE));
};

module.exports = {
  name: 'remove-user-language',
  created: new Date(2021, 6, 1, 0, 0, 0, 0),
  run: () => removeLanguageFromUserSettings(0)
};
