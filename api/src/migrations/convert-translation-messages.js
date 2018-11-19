const _ = require('underscore'),
  db = require('../db-pouch'),
  properties = require('properties'),
  DDOC_ID = '_design/medic';

const getAttachment = name => {
  return db.medic.getAttachment(DDOC_ID, name)
    .then(attachment => {
      return new Promise((resolve, reject) => {
        properties.parse(attachment.toString('utf8'), (err, values) => {
          if (err) {
            return reject(err);
          }
          resolve(values);
        });
      });
    });
};

module.exports = {
  name: 'convert-translation-messages',
  created: new Date(2018, 11, 8),
  run: () => {
      return db.medic.get(DDOC_ID)
        .then(function(ddoc) {
          const translationAttachmentKeys = Object.keys(ddoc._attachments).filter(k => k.includes('translations'));
          return Promise.all(translationAttachmentKeys.map((translationAttachmentKey) => {
            const translationMessageKey = translationAttachmentKey.match(/translations\/(.+).properties/)[1];
            return db.medic.get(translationMessageKey)
              .then(function(translationMessageValues) {
                if (_.has(translationMessageValues, 'values')) {
                  return getAttachment(translationAttachmentKey)
                    .then((translationAttachmentValues) => {
                      let genericTranslations = {};
                      let customTranslations = {}; 
                      return Promise.all(Object.keys(translationMessageValues.values).map((translationMessageKey) => {
                        if (_.has(translationAttachmentValues, translationMessageKey)) {
                          genericTranslations[translationMessageKey] = translationMessageValues.values[translationMessageKey];
                        } else {
                          customTranslations[translationMessageKey] = translationMessageValues.values[translationMessageKey];
                        }
                      }))
                      .then (() => {
                        delete translationMessageValues.values;
                        translationMessageValues.custom = customTranslations;
                        translationMessageValues.generic = genericTranslations;
                        return db.medic.put(translationMessageValues);
                      });             
                    });
                } 
              });
            }));
        });
  }
};