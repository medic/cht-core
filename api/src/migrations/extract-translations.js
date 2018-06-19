var _ = require('underscore'),
    {promisify} = require('util'),
    db = require('../db-nano'),
    settingsService = require('../services/settings'),
    DOC_TYPE = 'translations';

var getDocs = function(callback) {
  var options = { key: [ DOC_TYPE, true ], include_docs: true };
  db.medic.view('medic-client', 'doc_by_type', options, function(err, response) {
    if (err) {
      return callback(err);
    }
    callback(null, _.pluck(response.rows, 'doc'));
  });
};

var mergeEnabled = function(settings, docs) {
  if (!settings) {
    return;
  }
  settings.forEach(function(locale) {
    if (locale.disabled) {
      var doc = _.findWhere(docs, { code: locale.code });
      if (doc) {
        doc.enabled = false;
      }
    }
  });
};

var mergeTranslations = function(settings, docs) {
  if (!settings) {
    return;
  }
  settings.forEach(function(setting) {
    setting.translations.forEach(function(translation) {
      var doc = _.findWhere(docs, { code: translation.locale });
      if (doc) {
        if (!doc.values[setting.key] || translation.content !== translation.default) {
          // only update the doc if it was changed from the default
          doc.values[setting.key] = translation.content;
        }
      }
    });
  });
};

var updateDocs = settings => {
  return new Promise((resolve, reject) => {
    getDocs(function(err, docs) {
      if (err) {
        return reject(err);
      }
      if (!docs.length) {
        return resolve();
      }
      mergeEnabled(settings.locales, docs);
      mergeTranslations(settings.translations, docs);
      db.medic.bulk({ docs: docs }, err => {
        if (err) {
          return reject(err);
        }
        resolve();
      });
    });
  });
};

module.exports = {
  name: 'extract-translations',
  created: new Date(2016, 6, 29),
  run: promisify(function(callback) {
    settingsService.get()
      .then(settings => {
        if (!settings.translations || !settings.translations.length) {
          return;
        }
        return updateDocs(settings).then(() => {
          return settingsService.update({ translations: null, locales: null });
        });
      })
      .then(() => callback())
      .catch(callback);
  })
};
