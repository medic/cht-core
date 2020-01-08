const db = require('../db');
const properties = require('properties');
const DDOC_ID = '_design/medic';

const getAttachment = name => {
  return db.medic.getAttachment(DDOC_ID, `translations/${name}.properties`)
    .then(attachment => {
      return new Promise((resolve, reject) => {
        properties.parse(attachment.toString('utf8'), (err, values) => {
          if (err) {
            return reject(err);
          }
          resolve(values);
        });
      });
    })
    .catch(err => {
      if (err.status !== 404) {
        throw err;
      }
    });
};

const migrateTranslation = translationDoc => {
  if (!translationDoc.values) {
    return Promise.resolve();
  }

  translationDoc.generic = translationDoc.generic || {};
  translationDoc.custom = translationDoc.custom || {};

  return getAttachment(translationDoc._id)
    .then(originalTranslation => {
      if (!originalTranslation) {
        // copy values, preserving properties that might already exist
        return Object.assign(translationDoc.custom, translationDoc.values);
      }

      Object.keys(translationDoc.values).forEach(key => {
        // deliberately testing the existence of the property rather than the value
        // in custom languages many translations fields are empty
        if (key in originalTranslation) {
          translationDoc.generic[key] = translationDoc.values[key];
        } else {
          translationDoc.custom[key] = translationDoc.values[key];
        }
      });
    })
    .then(() => {
      delete translationDoc.values;
      // put instead of _bulk_docs so we don't implement checking for errors in the response
      return db.medic.put(translationDoc);
    });
};

module.exports = {
  name: 'convert-translation-messages-fix',
  created: new Date(2019, 6, 10),
  run: () => {
    return db.medic
      .query('medic-client/doc_by_type', {
        startkey: [ 'translations', false ],
        endkey: [ 'translations', true ],
        include_docs: true
      })
      .then(translations => {
        return Promise.all(translations.rows.map(row => migrateTranslation(row.doc)));
      });
  }
};
