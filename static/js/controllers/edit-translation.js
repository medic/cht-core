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

  var getUpdateFn = function(model) {
    if (model.key) {
      return createTranslationUpdate;
    }
    if (model.path) {
      return createSettingsUpdate;
    }
  };

  inboxControllers.controller('EditTranslationCtrl',
    ['$scope', '$rootScope', 'translateFilter', 'Settings', 'UpdateSettings',
    function ($scope, $rootScope, translateFilter, Settings, UpdateSettings) {

      var updateTranslation = function(settings, callback) {
        var model = $scope.translationModel;
        var populatedValues = _.filter(model.values, function(value) {
          return !!value.value;
        });
        var updateFn = getUpdateFn(model);
        if (!updateFn) {
          return callback('Invalid model');
        }
        var update = updateFn(settings, model, populatedValues);
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
        Settings()
          .then(function(res) {
            updateTranslation(res, function(err) {
              if (err) {
                return pane.done(translateFilter('Error saving settings'), err);
              }
              pane.done();
            });
          })
          .catch(function(err) {
            pane.done(translateFilter('Error retrieving settings'), err);
          });
      };

    }
  ]);

}());