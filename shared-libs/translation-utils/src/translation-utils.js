const _ = require('lodash');
const KEY_REGEX = /\${([^}\r\n]*)}/g;

const DOC_TYPE = 'translations';
const MESSAGES_DOC_ID_PREFIX = 'messages-';

module.exports = {
  loadTranslations: values => {
    if (!values || typeof values !== 'object') {
      return {};
    }

    Object.keys(values).forEach(key => {
      if (typeof(values[key]) === 'string') {
        values[key] = values[key].replace(KEY_REGEX, (match, key) => {
          return ['string', 'number'].includes(typeof(values[key])) && values[key] || ('${' + key + '}');
        });
      }
    });
    return values;
  }
};

module.exports.getTranslationDocs = async (db, logger) => {
  return db.medic
    .allDocs({ startkey: MESSAGES_DOC_ID_PREFIX, endkey: `${MESSAGES_DOC_ID_PREFIX}\ufff0`, include_docs: true })
    .then(response => {
      return response.rows
        .map(row => row.doc)
        .filter(doc => validTranslationsDoc(doc, logger));
    });
};

const validTranslationsDoc = (doc, logger) => {
  if (!doc || doc.type !== DOC_TYPE || !doc.code) {
    return false;
  }

  if (_.isObject(doc.generic) || _.isObject(doc.values)) {
    return true;
  }

  logger.warn(`Failed to load translations for "${doc.code}"("${doc.name}"). Translations document malformed.`);
  return false;
};
