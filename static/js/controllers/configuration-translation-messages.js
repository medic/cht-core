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
    ['$scope', '$rootScope', 'translateFilter', 'Settings', 'Language', 'OutgoingMessagesConfiguration',
    function ($scope, $rootScope, translateFilter, Settings, Language, OutgoingMessagesConfiguration) {

      var updateTranslationModels = function() {
        Settings(function(err, settings) {
          if (err) {
            return console.log('Error loading settings', err);
          }
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
        });
      };

      Settings()
        .then(function(res) {
          $scope.locales = res.locales;

          Language()
            .then(function(language) {
              $scope.localeModel = createLanguageModel(language, res.locales);
              updateTranslationModels();
              $scope.$watch('localeModel', function(curr, prev) {
                if (prev.lhs !== curr.lhs || prev.rhs !== curr.rhs) {
                  updateTranslationModels();
                }
              }, true);
            })
            .catch(function(err) {
              console.log('Error loading language', err);
            });
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