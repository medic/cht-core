const db = require('../db'),
      properties = require('properties'),
      DDOC_ID = '_design/medic';

const getAttachment = name => {
  return db.medic.getAttachment(DDOC_ID, `/translations/${name}.properties/`)
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

module.exports = {
  name: 'convert-translation-messages',
  created: new Date(2018, 11, 8),
  run: () => {
    return db.medic.query('medic-client/doc_by_type', {
      startkey: [ 'translations', false ],
      endkey: [ 'translations', true ],
      include_docs: true
    }).then(translations => {
      return Promise.all(translations.map(translationRecord => {
        if (translationRecord.values) {
            return getAttachment(translationRecord._id)
              .then(originalTranslation => {
                translationRecord.generic = {};
                translationRecord.custom = {};

                if (originalTranslation) {
                  Object.keys(translationRecord.values).forEach(key => {
                    if (originalTranslation[key]) {
                      translationRecord.generic[key] = translationRecord.values[key];
                    } else {
                      translationRecord.custom[key] = translationRecord.values[key];
                    }
                  });
                } else {
                  translationRecord.generic = translationRecord.values;
                }

                delete translationRecord.values;
                return db.medic.put(translationRecord);
              });
          }
      }));
    });
  }
};
