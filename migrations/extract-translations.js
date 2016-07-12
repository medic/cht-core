var _ = require('underscore'),
    db = require('../db'),
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
  settings.forEach(function(setting) {
    setting.translations.forEach(function(translation) {
      var doc = _.findWhere(docs, { code: translation.locale });
      if (doc) {
        doc.values[setting.key] = translation.content || setting.default;
      }
    });
  });
};

var updateDocs = function(settings, callback) {
  getDocs(function(err, docs) {
    if (err) {
      return callback(err);
    }
    if (!docs.length) {
      return callback();
    }
    mergeEnabled(settings.locales, docs);
    mergeTranslations(settings.translations, docs);
    db.medic.bulk({ docs: docs }, callback);
  });
};

module.exports = {
  name: 'extract-translations',
  created: new Date(2016, 6, 29),
  run: function(callback) {
    db.getSettings(function(err, data) {
      if (err) {
        return callback(err);
      }
      var settings = data.settings;
      if (!settings.translations || !settings.translations.length) {
        return callback();
      }
      updateDocs(settings, function(err) {
        if (err) {
          return callback(err);
        }
        db.updateSettings({ translations: null, locales: null }, callback);
      });
    });
  }
};
