var _ = require('underscore');

(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('ConfigurationTranslationApplicationCtrl',
    function (
      $log,
      $q,
      $rootScope,
      $scope,
      DB,
      Language,
      Settings
    ) {

      'ngInject';

      var createLanguageModel = function(language, languages) {
        var rhs = _.find(languages, function(current) {
          return current.code !== language;
        });
        return {
          lhs: language || 'en',
          rhs: rhs && rhs.code || 'en'
        };
      };

      var createTranslationModels = function() {
        // TODO null checks
        var lhs = $scope.translations[$scope.localeModel.lhs];
        var rhs = $scope.translations[$scope.localeModel.rhs];
        return Object.keys(lhs).map(function(key) {
          return {
            key: key,
            lhs: lhs[key],
            rhs: rhs[key]
          };
        });
      };

      var getTranslations = function(locale) {
        return DB().get('messages-' + locale)
          .catch(function(err) {
            if (err.status === 404) {
              // doc not found - run with it
              return {};
            }
            throw err;
          });
      };

      var updateTranslationModels = function() {
        $q.all($scope.locales.map(function(locale) {
          return getTranslations(locale.code);
        }))
          .then(function(results) {
            $scope.translations = {};
            results.forEach(function(doc) {
              $scope.translations[doc.code] = doc.values;
            });
            console.log('results', results, $scope.translations);
            $scope.translationModels = createTranslationModels(
              results[0],
              results[1]
            );
          })
          .catch(function(err) {
            $log.error('Error fetching translation documents', err);
          });
      };

      $q.all([ Settings(), Language() ])
        .then(function(results) {
          var settings = results[0];
          var language = results[1];
          $scope.locales = settings.locales;
          console.log('settings.locales', settings.locales);
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

      // TODO Pull out as angular modal controller thingee
      // TODO Change translation to key
      $scope.prepareEditTranslation = function(key) {
        $rootScope.$broadcast('EditTranslationInit', key, $scope.translations);
      };
      // TODO use db changes feed
      $scope.$on('TranslationUpdated', function(e, data) {
        if (data.translations) {
          updateTranslationModels();
        }
      });

    }
  );

}());