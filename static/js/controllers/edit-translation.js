var _ = require('underscore'),
    modal = require('../modules/modal'),
    objectpath = require('views/lib/objectpath');

(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  var findValue = function(locale, translation) {
    var result = _.findWhere(translation.translations, { locale: locale.code });
    return result && result.content;
  };

  var mapPopulatedValues = function(populatedValues) {
    return _.map(populatedValues, function(value) {
      return {
        locale: value.locale.code,
        content: value.value
      };
    });
  };

  var createTranslationUpdate = function(settings, model, populatedValues) {
    var updated = _.findWhere(settings.translations, { key: model.key });
    updated.translations = mapPopulatedValues(populatedValues);
    return { translations: settings.translations };
  };

  var createSettingsUpdate = function(settings, model, populatedValues) {
    var trunk = model.path.split('.')[0].replace(/\[[0-9]*\]/, '');
    var updated = {};
    updated[trunk] = settings[trunk];
    var leaf = objectpath.get(updated, model.path);
    leaf.message = mapPopulatedValues(populatedValues);
    return updated;
  };

  inboxControllers.controller('EditTranslationCtrl',
    ['$scope', '$rootScope', '$timeout', 'translateFilter', 'Settings', 'UpdateSettings',
    function ($scope, $rootScope, $timeout, translateFilter, Settings, UpdateSettings) {

      var updateTranslation = function(settings, model, callback) {
        var populatedValues = _.filter(model.values, function(value) {
          return !!value.value;
        });
        var update;
        if (model.key) {
          update = createTranslationUpdate(settings, model, populatedValues);
        } else if (model.path) {
          update = createSettingsUpdate(settings, model, populatedValues);
        } else {
          return callback('Invalid model');
        }
        UpdateSettings(update, function(err) {
          if (!err) {
            $rootScope.$broadcast('TranslationUpdated', update);
          }
          callback(err);
        });
      };

      $scope.$on('EditTranslationInit', function(e, translation, locales) {
        $scope.translationModel = { 
          key: translation.key,
          path: translation.path,
          default: translation.default
        };
        $scope.translationModel.values = _.map(locales, function(locale) {
          return {
            locale: locale,
            value: findValue(locale, translation)
          };
        });
      });

      $scope.saveTranslation = function() {
        var pane = modal.start($('#edit-translation'));
        Settings(function(err, res) {
          if (err) {
            return pane.done(translateFilter('Error retrieving settings'), err);
          }
          updateTranslation(res, $scope.translationModel, function(err) {
            if (err) {
              return pane.done(translateFilter('Error saving settings'), err);
            }
            pane.done();
          });
        });
      };

    }
  ]);

}());