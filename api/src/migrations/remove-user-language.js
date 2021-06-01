const db = require('../db');
const BATCH_SIZE = 100;

const removeLanguage = (docs) => {
  docs.forEach(doc => delete doc.language);
  return db.medic.bulkDocs(docs);
};

const needsUpdate = (row) => Object.prototype.hasOwnProperty.call(row.doc, 'language');

const fixUsers = function(skipSize) {
  const options = {
    include_docs: true,
    limit: BATCH_SIZE,
    skip: skipSize,
    key: [ 'user-settings' ]
  };
  return db.medic.query('medic-client/doc_by_type', options)
    .then(result => {
      if (!result.rows || !result.rows.length) {
        return Promise.resolve();
      }
      const rowsWithLanguage = result.rows.filter(needsUpdate).map(row => row.doc);
      if (!rowsWithLanguage.length) {
        return fixUsers(skipSize + BATCH_SIZE);
      }
      return removeLanguage(rowsWithLanguage)
        .then(() => fixUsers(skipSize + BATCH_SIZE));
    });
};

module.exports = {
  name: 'remove-user-language',
  created: new Date(2021, 6, 1, 0, 0, 0, 0),
  run: () => fixUsers(0)
};
