const _ = require('underscore'),
  { promisify } = require('util'),
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
  run: promisify(async (callback) => {
    try {
      const ddoc = await db.medic.get(DDOC_ID);
      const translationAttachmentKeys = Object.keys(ddoc._attachments).filter(k => k.includes('translations'));
      await Promise.all(translationAttachmentKeys.map(async (translationAttachmentKey) => {
        const translationMessageKey = translationAttachmentKey.match(/translations\/(.+).properties/)[1];
        const translationMessageValues = await db.medic.get(translationMessageKey);

        if (_.has(translationMessageValues, 'values')) {
          const translationAttachmentValues = await getAttachment(translationAttachmentKey);

          let genericTranslations = {};
          let customTranslations = {};
          await Promise.all(Object.keys(translationMessageValues.values).map(async (translationMessageKey) => {
            if (_.has(translationAttachmentValues, translationMessageKey)) {
              genericTranslations[translationMessageKey] = translationMessageValues.values[translationMessageKey];
            } else {
              customTranslations[translationMessageKey] = translationMessageValues.values[translationMessageKey];
            }
          }));

          delete translationMessageValues.values;
          translationMessageValues.custom = customTranslations;
          translationMessageValues.generic = genericTranslations;

          await db.medic.put(translationMessageValues);
        }
      }));
      callback();
    } catch (e) {
      callback(e);
    }
  })
};