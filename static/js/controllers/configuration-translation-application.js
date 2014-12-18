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
    ['$scope', '$rootScope', 'Settings', 'Language',
    function ($scope, $rootScope, Settings, Language) {

      var updateTranslationModels = function(translations) {
        $scope.translationModels = createTranslationModels(
          translations,
          $scope.localeModel
        );
      };

      Settings(function(err, res) {
        if (err) {
          return console.log('Error loading settings', err);
        }

        $scope.locales = res.locales;

        Language().then(function(language) {
          $scope.localeModel = createLanguageModel(language, res.locales);
          updateTranslationModels(res.translations);
          $scope.$watch('localeModel', function(curr, prev) {
            if (prev.lhs !== curr.lhs || prev.rhs !== curr.rhs) {
              updateTranslationModels(res.translations);
            }
          }, true);
        });
      });

      $scope.prepareEditTranslation = function(translation) {
        $rootScope.$broadcast('EditTranslationInit', translation, $scope.locales);
      };
      $scope.$on('TranslationUpdated', function(e, data) {
        updateTranslationModels(data.translations);
      });

    }
  ]);

}());