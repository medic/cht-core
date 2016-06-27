var _ = require('underscore'),
    properties = require('properties'),
    objectpath = require('views/lib/objectpath'),
    APPLICATION_TEXT_SECTION_NAME = 'Application Text',
    OUTGOING_MESSAGES_SECTION_NAME = 'Outgoing Messages';

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  inboxServices.factory('ImportProperties',
    function(
      $q,
      DB,
      Settings,
      UpdateSettings
    ) {
      'ngInject';

      var mergeTranslation = function(translations, locale, value) {
        var translation = _.findWhere(translations, { locale: locale });
        if (!translation) {
          translation = { locale: locale };
          translations.push(translation);
        }
        translation.content = value;
      };

      var mergeSettings = function(parsed, locale) {
        if (!parsed) {
          return;
        }
        return Settings()
          .then(function(settings) {
            var updated = false;
            _.pairs(parsed).forEach(function(pair) {
              var setting = objectpath.get(settings, pair[0]);
              if (setting) {
                mergeTranslation(setting.message, locale, pair[1]);
                updated = true;
              }
            });
            if (!updated) {
              return;
            }
            return UpdateSettings(settings, function(err) {
              if (err) {
                return $q.reject(err);
              }
              return $q.resolve();
            });
          });
      };

      var mergeTranslations = function(parsed, doc) {
        if (!parsed) {
          return;
        }
        var updated = false;
        Object.keys(parsed).forEach(function(key) {
          if (doc.values[key] !== parsed[key]) {
            doc.values[key] = parsed[key];
            updated = true;
          }
        });
        if (!updated) {
          return;
        }
        return DB().put(doc);
      };

      var parse = function(contents) {
        return $q(function(resolve, reject) {
          properties.parse(contents, { sections: true }, function(err, parsed) {
            if (err) {
              return reject(err);
            }
            resolve({
              translations: parsed[APPLICATION_TEXT_SECTION_NAME],
              messages: parsed[OUTGOING_MESSAGES_SECTION_NAME]
            });
          });
        });
      };

      return function(contents, doc) {
        return parse(contents)
          .then(function(parsed) {
            return $q.all([
              mergeTranslations(parsed.translations, doc),
              mergeSettings(parsed.messages, doc.code)
            ]);
          });
      };
    }
  );

  inboxServices.factory('ExportProperties',
    function(
      OutgoingMessagesConfiguration
    ) {
      'ngInject';

      var getProperty = function(key, translation, locale) {
        var value = _.findWhere(translation.translations, { locale: locale.code });
        return {
          key: key,
          value: value && value.content
        };
      };

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
