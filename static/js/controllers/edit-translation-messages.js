var _ = require('underscore'),
    objectpath = require('object-path');

(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('EditTranslationMessagesCtrl',
    function (
      $scope,
      $uibModalInstance,
      Settings,
      UpdateSettings
    ) {

      'ngInject';

      $scope.configuration = $scope.model.translation;
      // remove translations with falsey locales
      $scope.configuration.translations = _.filter($scope.configuration.translations, function(translation) {
        return translation.locale;
      });
      $scope.locales = $scope.model.locales;
      $scope.localeNames = {};
      $scope.model.locales.forEach(function(locale) {
        // add missing translations
        if (!_.findWhere($scope.configuration.translations, { locale: locale.code })) {
          $scope.configuration.translations.push({
            locale: locale.code,
            content: ''
          });
        }
        // build a mapping of local code -> name
        $scope.localeNames[locale.code] = locale.name;
      });

      var updateTranslation = function(settings) {
        var trunk = $scope.configuration.path.split('.')[0].replace(/\[[0-9]*\]/, '');
        var updated = {};
        updated[trunk] = settings[trunk];
        // objectpath uses `array.1.property` instead of `array[1].property`
        var path = $scope.configuration.path.replace(/\[([0-9]*)\]/g, '.$1');
        var leaf = objectpath.get(updated, path);
        leaf.message = $scope.configuration.translations;
        return UpdateSettings(updated);
      };

      $scope.submit = function() {
        $scope.setProcessing();
        return Settings()
          .then(updateTranslation)
          .then(function() {
            $scope.setFinished();
            $uibModalInstance.close();
          })
          .catch(function(err) {
            $scope.setError(err, 'Error updating settings');
          });
      };

      $scope.cancel = function() {
        $uibModalInstance.dismiss();
      };

    }
  );

}());
