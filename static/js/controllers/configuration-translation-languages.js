(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('ConfigurationTranslationLanguagesCtrl',
    ['$scope', '$rootScope', 'Settings', 'UpdateSettings',
    function ($scope, $rootScope, Settings, UpdateSettings) {
      Settings(function(err, res) {
        if (err) {
          return console.log('Error loading settings', err);
        }
        $scope.languagesModel = {
          default: {
            locale: res.locale,
            outgoing: res.locale_outgoing
          },
          locales: res.locales
        };
        $scope.prepareEditLanguage = function(locale) {
          $rootScope.$broadcast('EditLanguageInit', locale);
        };
        $scope.prepareDeleteLanguage = function(locale) {
          $rootScope.$broadcast('DeleteLanguageInit', locale);
        };
        $scope.setLocale = function(locale) {
          UpdateSettings({ locale: locale.code }, function(err) {
            if (err) {
              return console.log('Error updating settings', err);
            }
            $scope.languagesModel.default.locale = locale.code;
          });
        };
        $scope.setLocaleOutgoing = function(locale) {
          UpdateSettings({ locale_outgoing: locale.code }, function(err) {
            if (err) {
              return console.log('Error updating settings', err);
            }
            $scope.languagesModel.default.outgoing = locale.code;
          });
        };
        $scope.$on('LanguageUpdated', function(e, data) {
          $scope.languagesModel.locales = data.locales;
        });
      });
    }
  ]);

}());