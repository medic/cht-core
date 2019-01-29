const _ = require('underscore');
const db = require('../db');
const settingsService = require('../services/settings');
const DOC_TYPE = 'translations';

const getDocs = () => {
  const options = { key: [ DOC_TYPE, true ], include_docs: true };
  return db.medic.query('medic-client/doc_by_type', options)
    .then(response => _.pluck(response.rows, 'doc'));
};

const mergeEnabled = (settings, docs) => {
  if (!settings) {
    return;
  }
  settings.forEach(function(locale) {
    if (locale.disabled) {
      const doc = _.findWhere(docs, { code: locale.code });
      if (doc) {
        doc.enabled = false;
      }
    }
  });
};

const mergeTranslations = (settings, docs) => {
  if (!settings) {
    return;
  }
  settings.forEach(setting => {
    setting.translations.forEach(translation => {
      const doc = _.findWhere(docs, { code: translation.locale });
      if (doc) {
        if (_.has(doc, 'values')) {
          if (!doc.values[setting.key] || translation.content !== translation.default) {
            // only update the doc if it was changed from the default
            doc.values[setting.key] = translation.content;
          }
        } else { 
          if (!doc.generic[setting.key] || translation.content !== translation.default) {
            // only update the doc if it was changed from the default
            doc.generic[setting.key] = translation.content;
          }
        }
      }
    });
  });
};

const updateDocs = settings => {
  return getDocs().then(docs => {
    if (!docs.length) {
      return;
    }
    mergeEnabled(settings.locales, docs);
    mergeTranslations(settings.translations, docs);
    return db.medic.bulkDocs(docs);
  });
};

module.exports = {
  name: 'extract-translations',
  created: new Date(2016, 6, 29),
  run: () => {
    return settingsService.get().then(settings => {
      if (!settings.translations || !settings.translations.length) {
        return;
      }
      return updateDocs(settings).then(() => {
        return settingsService.update({ translations: null, locales: null });
      });
    });
  }
};
