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
    function (
      $q,
      $rootScope,
      $scope,
      $translate,
      Settings,
      UpdateSettings
    ) {

      'ngInject';

      var updateTranslation = function(settings) {
        var model = $scope.translationModel;
        var populatedValues = _.filter(model.values, function(value) {
          return !!value.value;
        });
        var updateFn = getUpdateFn(model);
        if (!updateFn) {
          return $q.reject(new Error('Invalid translation model'));
        }
        return $q(function(resolve, reject) {
          var update = updateFn(settings, model, populatedValues);
          UpdateSettings(update, function(err) {
            if (err) {
              return reject(err);
            }
            resolve(update);
          });
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
        return Settings()
          .then(updateTranslation)
          .then(function(update) {
            $rootScope.$broadcast('TranslationUpdated', update);
            pane.done();
          })
          .catch(function(err) {
            $translate('Error updating settings').then(function(message) {
              pane.done(message, err);
            });
          });
      };

    }
  );

}());