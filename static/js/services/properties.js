var _ = require('underscore'),
    properties = require('properties'),
    objectpath = require('views/lib/objectpath'),
    applicationTextSection = 'Application Text',
    outgoingMessagesSection = 'Outgoing Messages';

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

  var mergeTranslations = function(parsed, settings, locale) {
    _.pairs(parsed).forEach(function(pair) {
      var setting = _.findWhere(settings.translations, { key: pair[0] });
      if (setting) {
        mergeTranslation(setting.translations, locale, pair[1]);
      }
    });
  };

  var mergeSettings = function(parsed, settings, locale) {
    _.pairs(parsed).forEach(function(pair) {
      var setting = objectpath.get(settings, pair[0]);
      if (setting) {
        mergeTranslation(setting.message, locale, pair[1]);
      }
    });
  };

  inboxServices.factory('ImportProperties',
    ['translateFilter', 'Settings', 'UpdateSettings',
    function(translateFilter, Settings, UpdateSettings) {
      return function(contents, locale, callback) {
        properties.parse(contents, { sections: true }, function(err, parsed) {
          if (err) {
            return callback(translateFilter('Error parsing properties file') + '. ' + err);
          }
          Settings()
            .then(function(settings) {
              mergeTranslations(parsed[applicationTextSection], settings, locale);
              mergeSettings(parsed[outgoingMessagesSection], settings, locale);
              UpdateSettings(settings, function(err) {
                if (err) {
                  return callback(translateFilter('Error saving settings') + '. ' + err);
                }
                callback();
              });
            })
            .catch(function(err) {
              callback(translateFilter('Error retrieving settings') + '. ' + err);
            });
        });
      };
    }
  ]);

  var getProperty = function(key, translation, locale) {
    var value = _.findWhere(translation.translations, { locale: locale });
    return {
      key: key,
      value: value && value.content
    };
  };

  inboxServices.factory('ExportProperties',
    ['OutgoingMessagesConfiguration',
    function(OutgoingMessagesConfiguration) {
      return function(settings, locale) {
        var stringifier = properties.createStringifier();

        stringifier.section(applicationTextSection);
        settings.translations.forEach(function(translation) {
          stringifier.property(getProperty(translation.key, translation, locale));
        });

        stringifier.section(outgoingMessagesSection);
        var messages = OutgoingMessagesConfiguration(settings);
        messages.forEach(function(subsection) {
          subsection.translations.forEach(function(translation) {
            stringifier.property(getProperty(translation.path, translation, locale));
          });
        });

        return properties.stringify(stringifier);
      };
    }
  ]);

}()); 
