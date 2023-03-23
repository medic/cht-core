const _ = require('lodash');

const db = require('../db');
const logger = require('../logger');

module.exports = {
  name: 'restrict-access-to-vault-db',
  created: new Date(2023, 2, 23),
  run: async () => {
    const settings = await db.medic.get('settings');
    if (settings.enabledLocales) {
      return;
    }

    const translations = await db.medic.query('medic-client/doc_by_type', {
      startkey: [ 'translations', false ],
      endkey: [ 'translations', true ],
      include_docs: true
    });
    const translations2 = await db.medic
      .allDocs({ startkey: 'messages-', endkey: 'messages-\ufff0', include_docs: true });
    console.log("translations", translations);
    console.log("translations2", translations2);
    const enabledLocales = [];
    for (const row of translations.rows) {
      if (validTranslationsDoc(row.doc)) {
        enabledLocales.push(row.doc.code);
      }
    }
    settings.enabledLocales = enabledLocales;
    // await db.medic.put(settings);
  }
};

const validTranslationsDoc = doc => {
  if (!doc || doc.type !== 'translations' || !doc.code) {
    return false;
  }

  if (_.isObject(doc.generic) || _.isObject(doc.values)) {
    return true;
  }

  logger.warn(`Failed to load translations for "${doc.code}"("${doc.name}"). Translations document malformed.`);
  return false;
};

