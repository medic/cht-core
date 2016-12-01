var _ = require('underscore'),
    follow = require('follow'),
    db = require('./db'),
    ddocExtraction = require('./ddoc-extraction'),
    translations = require('./translations'),
    defaults = require('./config.default.json'),
    settings = {},
    translationCache = {};

var getMessage = function(value, locale) {

  var _findTranslation = function(value, locale) {
    if (value.translations) {
      var translation = _.findWhere(
        value.translations, { locale: locale }
      );
      return translation && translation.content;
    } else {
      // fallback to old translation definition to support
      // backwards compatibility with existing forms
      return value[locale];
    }
  };

  if (!_.isObject(value)) {
    return value;
  }

  var test = false;
  if (locale === 'test') {
    test = true;
    locale = 'en';
  }

  var result =

    // 1) Look for the requested locale
    _findTranslation(value, locale) ||

    // 2) Look for the default
    value.default ||

    // 3) Look for the English value
    _findTranslation(value, 'en') ||

    // 4) Look for the first translation
    (value.translations && value.translations[0] && value.translations[0].content) ||

    // 5) Look for the first value
    value[_.first(_.keys(value))];

  if (test) {
    result = '-' + result + '-';
  }

  return result;
};

var loadSettings = function(callback) {
  db.medic.get('_design/medic', function(err, ddoc) {
    if (err) {
      return callback(err);
    }
    settings = ddoc.app_settings;
    var original = JSON.stringify(settings);
    _.defaults(settings, defaults);
    // add any missing permissions
    defaults.permissions.forEach(function(def) {
      var configured = _.findWhere(settings.permissions, { name: def.name });
      if (!configured) {
        settings.permissions.push(def);
      }
    });
    var changed = JSON.stringify(settings) !== original;
    if (!changed) {
      return callback();
    }
    console.log('Updating settings with new defaults');
    db.updateSettings(settings, callback);
  });
};

var loadTranslations = function() {
  var options = { key: [ 'translations', true ], include_docs: true };
  db.medic.view('medic-client', 'doc_by_type', options, function(err, result) {
    if (err) {
      console.error('Error loading translations - starting up anyway', err);
      return;
    }
    result.rows.forEach(function(row) {
      translationCache[row.doc.code] = row.doc.values;
    });
  });
};

module.exports = {
  get: function(key) {
    return settings[key];
  },
  translate: function(key, locale, ctx) {
    if (_.isObject(locale)) {
      ctx = locale;
      locale = null;
    }
    locale = locale || (settings && settings.locale) || 'en';
    if (_.isObject(key)) {
      return getMessage(key, locale) || key;
    }
    var value = (translationCache[locale] && translationCache[locale][key]) ||
                (translationCache.en && translationCache.en[key]) ||
                key;
    // underscore templates will return ReferenceError if all variables in
    // template are not defined.
    try {
      return _.template(value)(ctx || {});
    } catch(e) {
      return value;
    }
  },
  load: function(callback) {
    loadSettings(callback);
    loadTranslations();
  },
  listen: function() {
    var feed = new follow.Feed({ db: process.env.COUCH_URL, since: 'now' });
    feed.on('change', function(change) {
      if (change.id === '_design/medic') {
        console.log('Detected settings change - reloading');
        translations.run(function(err) {
          if (err) {
            console.error('Failed to update translation docs', err);
          }
        });
        loadSettings(function(err) {
          if (err) {
            console.error('Failed to reload settings', err);
            process.exit(1);
          }
        });
        ddocExtraction.run(function(err) {
          if (err) {
            console.error('Something went wrong trying to extract ddocs', err);
            process.exit(1);
          }
        });
      } else if (change.id.indexOf('messages-') === 0) {
        console.log('Detected translations change - reloading');
        loadTranslations();
      }
    });
    feed.follow();
  }
};
