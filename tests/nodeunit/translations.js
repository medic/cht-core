'use strict';

var fs = require('fs'),
    _ = require('underscore');

var parseKanso = function(callback) {
  fs.readFile('kanso.json', function (err, data) {
    if (err) {
      return callback('Error reading kanso.json: ' + err);
    }
    try {
      var kanso = JSON.parse(data);
      return callback(null, kanso.settings_schema.properties.translations.default);
    } catch (e) {
      console.log(e);
      return callback('Failed to parse kanso.json');
    }
  });
};

var parseAppSettings = function() {
  var data = require('../../packages/kujua-sms/views/lib/app_settings');
  return data.translations;
};

var findDuplicates = function(data) {
  var found = [];
  var duplicates = [];
  _.each(_.pluck(data, 'key'), function(key) {
    if (_.contains(found, key)) {
      duplicates.push(key);
    } else {
      found.push(key);
    }
  });
  return duplicates;
};

var findMissing = function(from, to) {
  var missing = [];
  _.each(from, function(f) {
    if (!_.contains(to, f)) {
      missing.push(f);
    }
  });
  return missing;
};

exports['kanso default translation keys are unique'] = function(test) {
  test.expect(1);
  parseKanso(function(err, data) {
    if (err) {
      test.ok(false, err);
    } else {
      var duplicates = findDuplicates(data);
      test.equals(0, duplicates.length, 'Duplicate translations in kanso: ' + JSON.stringify(duplicates));
    }
    test.done();
  });
};

exports['app_settings default translation keys are unique'] = function(test) {
  test.expect(1);
  var data = parseAppSettings();
  var duplicates = findDuplicates(data);
  test.equals(0, duplicates.length, 'Duplicate translations in app_settings: ' + JSON.stringify(duplicates));
  test.done();
};

exports['kanso and app_settings defaults are consistent'] = function(test) {
  test.expect(2);
  var appsettings = _.pluck(parseAppSettings(), 'key');
  parseKanso(function(err, data) {
    var kanso = _.pluck(data, 'key');
    var missingFromAppSettings = findMissing(kanso, appsettings);
    var missingFromKanso = findMissing(appsettings, kanso);
    test.equals(0, missingFromAppSettings.length, 'Missing translations from app_settings.js: ' + JSON.stringify(missingFromAppSettings));
    test.equals(0, missingFromKanso.length, 'Missing translations from kanso.json: ' + JSON.stringify(missingFromKanso));
    test.done();
  });
};