var _ = require('underscore'),
    properties = require('properties'),
    objectpath = require('views/lib/objectpath'),
    APPLICATION_TEXT_SECTION_NAME = 'Application Text',
    OUTGOING_MESSAGES_SECTION_NAME = 'Outgoing Messages';

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  var mergeTranslation = function(translations, locale, value) {
    var translation = _.findWhere(translations, { locale: locale });
    if (!translation) {
      translation = { locale: locale };
      translations.push(translation);
    }
    translation.content = value;
  };

  var mergeSettings = function(parsed, settings, locale) {
    _.pairs(parsed).forEach(function(pair) {
      var setting = objectpath.get(settings, pair[0]);
      if (setting) {
        mergeTranslation(setting.message, locale, pair[1]);
      }
    });
  };

  var mergeTranslations = function(parsed, doc) {
    Object.keys(parsed).forEach(function(key) {
      doc.values[key] = parsed[key];
    });
  };

  inboxServices.factory('ImportProperties',
    function(
      DB,
      Settings,
      UpdateSettings
    ) {
      'ngInject';
      return function(contents, doc, callback) {
        properties.parse(contents, { sections: true }, function(err, parsed) {
          if (err) {
            return callback(err);
          }
          mergeTranslations(parsed[APPLICATION_TEXT_SECTION_NAME], doc);
          DB()
            .put(doc)
            .then(Settings)
            .then(function(settings) {
              mergeSettings(parsed[OUTGOING_MESSAGES_SECTION_NAME], settings, doc.code);
              UpdateSettings(settings, callback);
            })
            .catch(function(err) {
              return callback(err);
            });
        });
      };
    }
  );

  var getProperty = function(key, translation, locale) {
    var value = _.findWhere(translation.translations, { locale: locale.code });
    return {
      key: key,
      value: value && value.content
    };
  };

  inboxServices.factory('ExportProperties',
    function(
      OutgoingMessagesConfiguration
    ) {
      'ngInject';
      return function(settings, locale) {
        var stringifier = properties.createStringifier();

        stringifier.section(APPLICATION_TEXT_SECTION_NAME);
        Object.keys(locale.values).forEach(function(key) {
          stringifier.property({ key: key, value: locale.values[key] });
        });

        stringifier.section(OUTGOING_MESSAGES_SECTION_NAME);
        var messages = OutgoingMessagesConfiguration(settings);
        messages.forEach(function(subsection) {
          subsection.translations.forEach(function(translation) {
            stringifier.property(getProperty(translation.path, translation, locale));
          });
        });

        return properties.stringify(stringifier);
      };
    }
  );

}()); 
