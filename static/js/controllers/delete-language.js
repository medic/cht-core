var _ = require('underscore'),
    modal = require('../modules/modal');

(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('DeleteLanguageCtrl',
    ['$scope', '$rootScope', 'translateFilter', 'Settings', 'UpdateSettings',
    function ($scope, $rootScope, translateFilter, Settings, UpdateSettings) {
      $scope.$on('DeleteLanguageInit', function(e, language) {
        $scope.language = language;
      });
      $scope.deleteLanguage = function() {
        var pane = modal.start($('#delete-language'));
        Settings(function(err, res) {
          if (err) {
            return pane.done(translateFilter('Error retrieving settings'), err);
          }

          var locales = _.reject(_.clone(res.locales), function(locale) {
            return locale.code === $scope.language.code;
          });

          UpdateSettings({ locales: locales }, function(err) {
            if (err) {
              return pane.done(translateFilter('Error saving settings'), err);
            }
            $scope.language = null;
            $rootScope.$broadcast('LanguageUpdated', { locales: locales });
            pane.done();
          });
        });
      };
    }
  ]);

}());