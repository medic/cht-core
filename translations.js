var fs = require('fs'),
    path = require('path'),
    async = require('async'),
    _ = require('underscore'),
    properties = require('properties'),
    db = require('./db'),
    config = require('./config'),
    dir = path.join(__dirname, 'translations');

var extractCountryCode = function(filename) {
  var parts = /messages\-([a-z]*)\.properties/.exec(filename);
  if (parts && parts[1]) {
    return parts[1].toLowerCase();
  }
};

var merge = function(memo, locale, key, value) {
  if (!value) {
    return;
  }
  var setting = _.findWhere(memo.translations, { key: key });
  if (!setting) {
    setting = { key: key };
    memo.translations.push(setting);
    memo.changed = true;
  }
  if (!setting.translations) {
    setting.translations = [];
  }
  var translation = _.findWhere(setting.translations, { locale: locale });
  if (translation) {
    if (translation.default === translation.content &&
        translation.content !== value) {
      translation.content = value;
      memo.changed = true;
    }
    if (translation.default !== value) {
      translation.default = value;
      memo.changed = true;
    }
  } else {
    setting.translations.push({
      locale: locale,
      content: value,
      default: value
    });
  }
};

var processFile = function(memo, file, callback) {
  var code = extractCountryCode(file);
  if (!code) {
    return callback(new Error('Could not parse country code for translation file "' + file + '"'));
  }
  fs.readFile(path.join(dir, file), 'utf-8', function(err, data) {
    if (err) {
      return callback(err);
    }
    properties.parse(data, function(err, parsed) {
      if (err) {
        return callback(err);
      }
      _.pairs(parsed).forEach(function(pair) {
        merge(memo, code, pair[0], pair[1]);
      });
      callback();
    });
  });
};

module.exports = {
  run: function(callback) {
    fs.readdir(dir, function(err, files) {
      if (err) {
        return callback(err);
      }
      var memo = {
        translations: config.get('translations') || [],
        changed: false
      };
      async.each(
        files,
        _.partial(processFile, memo),
        function(err) {
          if (err || !memo.changed) {
            return callback(err);
          }
          db.medic.get('_design/medic', function(err, ddoc) {
            if (err) {
              return callback(err);
            }
            ddoc.app_settings.translations = memo.translations;
            db.medic.insert(ddoc, callback);
          });
        }
      );
    });
  }
};