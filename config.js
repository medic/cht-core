var _ = require('underscore'),
    follow = require('follow'),
    db = require('./db'),
    settings;

var defaults = {
  anc_forms: {
    registration: 'R',
    registrationLmp: 'P',
    visit: 'V',
    delivery: 'D',
    flag: 'F'
  }
};

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

  locale = locale || (settings && settings.locale) || 'en';

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

module.exports = {
  get: function(key) {
    return settings[key];
  },
  translate: function(key, locale, ctx) {
    var value;
    ctx = ctx || {};

    if (_.isObject(locale)) {
      ctx = locale;
      locale = null;
    }

    if (_.isObject(key)) {
      return getMessage(key, locale) || key;
    }

    value = _.findWhere(settings.translations, { key: key });

    value = getMessage(value, locale) || key;

    // underscore templates will return ReferenceError if all variables in
    // template are not defined.
    try {
      return _.template(value)(ctx);
    } catch(e) {
      return value;
    }
  },
  load: function(callback) {
    db.getSettings(function(err, data) {
      if (err) {
        return callback(err);
      }
      settings = data.settings;
      _.defaults(settings, defaults);
      callback();
    });
  },
  listen: function() {
    var feed = new follow.Feed({
      db: process.env.COUCH_URL,
      since: 'now'
    });

    feed.filter = function(doc) {
      return doc._id === '_design/medic';
    };

    feed.on('change', function() {
      console.log('Detected settings change - reloading');
      module.exports.load(function(err) {
        if (err) {
          console.log('Failed to reload settings', err);
          process.exit(1);
        }
      });
    });

    feed.follow();
  }
};
