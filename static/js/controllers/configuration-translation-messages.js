var _ = require('underscore');

(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  var findTranslation = function(locale, translations) {
    var value = _.findWhere(translations, { locale: locale });
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

  inboxControllers.controller('ConfigurationTranslationMessagesCtrl',
    ['$scope', '$rootScope', '$q', 'translateFilter', 'Settings', 'Language', 'OutgoingMessagesConfiguration',
    function ($scope, $rootScope, $q, translateFilter, Settings, Language, OutgoingMessagesConfiguration) {

      var updateTranslationModels = function() {
        Settings()
          .then(function(settings) {
            var groupModels = OutgoingMessagesConfiguration(settings);
            $scope.groupModels = _.each(groupModels, function(group) {
              group.translations = _.map(group.translations, function(translation) {
                return {
                  lhs: findTranslation($scope.localeModel.lhs, translation.translations),
                  rhs: findTranslation($scope.localeModel.rhs, translation.translations),
                  raw: translation
                };
              });
            });
          })
          .catch(function(err) {
            console.log('Error loading settings', err);
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
          console.log('Error loading settings', err);
        });

      $scope.prepareEditTranslation = function(translation) {
        $rootScope.$broadcast('EditTranslationInit', translation, $scope.locales);
      };
      $scope.$on('TranslationUpdated', function(e, data) {
        if (!data.translations) {
          updateTranslationModels();
        }
      });
    }
  ]);

}());