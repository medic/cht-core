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
    ['$scope', '$rootScope', 'translateFilter', 'Settings', 'Language',
    function ($scope, $rootScope, translateFilter, Settings, Language) {

      var createGroupModel = function(labelParts, path, translations) {
        $scope.groupModels.push({
          label: labelParts.join(' › '),
          translations: _.map(translations, function(translation, index) {
            return {
              lhs: findTranslation($scope.localeModel.lhs, translation.message),
              rhs: findTranslation($scope.localeModel.rhs, translation.message),
              raw: {
                path: path + '[' + index + ']',
                translations: translation.message
              }
            };
          })
        });
      };

      var createReportModel = function(settings, groupCode, groupLabel) {
        settings[groupCode].forEach(function(report, index) {
          var reportName = report.name || report.form;
          createGroupModel(
            [ groupLabel, reportName, translateFilter('Messages') ],
            groupCode + '[' + index + '].messages',
            report.messages
          );
          if (report.validations) {
            createGroupModel(
              [ groupLabel, reportName, translateFilter('Validations') ],
              groupCode + '[' + index + '].validations.list',
              report.validations.list
            );
          }
        });
      };

      var updateTranslationModels = function() {
        Settings(function(err, settings) {
          if (err) {
            return console.log('Error loading settings', err);
          }
          $scope.groupModels = [];
          createReportModel(
            settings,
            'registrations',
            translateFilter('Registrations')
          );
          createReportModel(
            settings,
            'schedules',
            translateFilter('Schedules')
          );
          createReportModel(
            settings,
            'patient_reports',
            translateFilter('Patient Report')
          );
          createGroupModel(
            [ translateFilter('Notifications'), translateFilter('Messages') ],
            'notifications.messages',
            settings.notifications.messages
          );
          createGroupModel(
            [ translateFilter('Notifications'), translateFilter('Validations') ],
            'notifications.validations.list',
            settings.notifications.validations.list
          );
        });
      };

      Settings(function(err, res) {
        if (err) {
          return console.log('Error loading settings', err);
        }

        $scope.locales = res.locales;

        Language().then(function(language) {
          $scope.localeModel = createLanguageModel(language, res.locales);
          updateTranslationModels();
          $scope.$watch('localeModel', function(curr, prev) {
            if (prev.lhs !== curr.lhs || prev.rhs !== curr.rhs) {
              updateTranslationModels();
            }
          }, true);
        });
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