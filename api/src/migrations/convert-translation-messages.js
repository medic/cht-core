const _ = require('underscore'),
  { promisify } = require('util'),
  db = require('../db-nano');

module.exports = {
  name: 'convert-translation-messages',
  created: new Date(2018, 11, 8),
  run: promisify((callback) => {
	  db.request({
      db: db.settings.db,
      method: 'GET',
      path: '_design/medic',
    },
    (err, result) => {
      if (err) {
        return callback(err);
      }

      let translationAttachmentKeys = Object.keys(result._attachments).filter(k => k.includes('translations'));
      translationAttachmentKeys.forEach((translationAttachmentKey) => {
        let translationMessageKey = translationAttachmentKey.match(/translations\/(.+).properties/)[1];
        let translationMessageKeys = [translationMessageKey, translationMessageKey + '-backup'];
        translationMessageKeys.forEach((translationMessageKey) => {
          db.request({
            db: db.settings.db,
            method: 'GET',
            path: translationMessageKey,
          },
          (err, translationMessageValues) => {
            if (_.has(translationMessageValues, 'values')) {
              db.request({
                db: db.settings.db,
                method: 'GET',
                path: '_design/medic/' + translationAttachmentKey,
              },
              (err, translationAttachmentValue) => {
                if (err) {
                  return callback(err);
                }

                let defaultTranslations = {};
                let customTranslations = {};
                Object.keys(translationMessageValues.values).forEach((translationMessageKey) => {
                  if (translationAttachmentValue.includes(translationMessageKey.replace(' ', '\\ '))) {
                    defaultTranslations[translationMessageKey] = translationMessageValues.values[translationMessageKey];
                  } else {
                    customTranslations[translationMessageKey] = translationMessageValues.values[translationMessageKey];
                  }
                });

                delete translationMessageValues.values;
                translationMessageValues.custom = customTranslations;
                translationMessageValues.default = defaultTranslations;

                db.request({
                  db: db.settings.db,
                  method: 'PUT',
                  path: translationMessageKey,
                  body: translationMessageValues
                },
                (err) => {
                  if (err) {
                    return callback(err);
                  }
                });
              });
            }
          });
        });
      });

      callback();
    });
  })
};