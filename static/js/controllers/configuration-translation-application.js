var _ = require('underscore');

(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  var findTranslation = function(locale, translation) {
    var value = _.findWhere(translation.translations, { locale: locale });
    return value && value.content;
  };

  var createLanguageModel = function(language, languages) {
    var rhs = _.find(languages, function(current) {
      return current.code !== language;
    });
    return {
      lhs: language || 'en',
      rhs: rhs && rhs.code || 'en'
    };
  };

  var createTranslationModels = function(translations, localeModel) {
    return _.map(translations, function(translation) {
      return {
        key: translation.key,
        lhs: findTranslation(localeModel.lhs, translation),
        rhs: findTranslation(localeModel.rhs, translation),
        raw: translation
      };
    });
  };

  inboxControllers.controller('ConfigurationTranslationApplicationCtrl',
    function (
      $log,
      $q,
      $rootScope,
      $scope,
      Language,
      Settings
    ) {

      'ngInject';

      var updateTranslationModels = function() {
        Settings()
          .then(function(settings) {
            $scope.translationModels = createTranslationModels(
              settings.translations,
              $scope.localeModel
            );
          })
          .catch(function(err) {
            $log.error('Error loading settings', err);
          });
      };

      $q.all([Settings(), Language()])
        .then(function(results) {
          var settings = results[0];
          var language = results[1];
          $scope.locales = settings.locales;
          $scope.localeModel = createLanguageModel(language, settings.locales);
          updateTranslationModels();
          $scope.$watch('localeModel', function(curr, prev) {
            if (prev.lhs !== curr.lhs || prev.rhs !== curr.rhs) {
              updateTranslationModels();
            }
          }, true);
        })
        .catch(function(err) {
          $log.error('Error loading settings', err);
        });

      $scope.prepareEditTranslation = function(translation) {
        $rootScope.$broadcast('EditTranslationInit', translation, $scope.locales);
      };
      $scope.$on('TranslationUpdated', function(e, data) {
        if (data.translations) {
          updateTranslationModels();
        }
      });

    }
  );

}());