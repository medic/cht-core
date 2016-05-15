var _ = require('underscore'),
    modal = require('../modules/modal');

(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('DeleteLanguageCtrl',
    function (
      $rootScope,
      $scope,
      $translate,
      Settings,
      UpdateSettings
    ) {

      'ngInject';

      $scope.$on('DeleteLanguageInit', function(e, language) {
        $scope.language = language;
      });

      $scope.deleteLanguage = function() {
        var pane = modal.start($('#delete-language'));
        var code = $scope.language && $scope.language.code;
        if (!code) {
          $translate('Error saving settings').then(function(message) {
            return pane.done(message, new Error('No language code in $scope so could not delete.'));
          });
        }
        Settings()
          .then(function(settings) {
            var locales = _.reject(_.clone(settings.locales), function(locale) {
              return locale.code === code;
            });

            UpdateSettings({ locales: locales }, function(err) {
              if (err) {
                $translate('Error saving settings').then(function(message) {
                  pane.done(message, err);
                });
                return;
              }
              $scope.language = null;
              $rootScope.$broadcast('LanguageUpdated', {
                locales: locales,
                settings: settings
              });
              pane.done();
            });
          })
          .catch(function(err) {
            $translate('Error retrieving settings').then(function(message) {
              pane.done(message, err);
            });
          });
      };
    }
  );

}());