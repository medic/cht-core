(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('ConfigurationTranslationLanguagesCtrl',
    ['$scope', '$rootScope', 'Settings',
    function ($scope, $rootScope, Settings) {
      Settings(function(err, res) {
        if (err) {
          return console.log('Error loading settings', err);
        }
        $scope.languagesModel = {
          locales: res.locales
        };
        $scope.prepareEditLanguage = function(locale) {
          $rootScope.$broadcast('EditLanguageInit', locale);
        };
        $scope.prepareDeleteLanguage = function(locale) {
          $rootScope.$broadcast('DeleteLanguageInit', locale);
        };
        $scope.$on('LanguageUpdated', function(e, data) {
          $scope.languagesModel.locales = data.locales;
        });
      });
    }
  ]);

}());