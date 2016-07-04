var _ = require('underscore'),
    modal = require('../modules/modal'),
    objectpath = require('views/lib/objectpath');

(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('EditTranslationMessagesCtrl',
    function (
      $q,
      $scope,
      $translate,
      $uibModalInstance,
      model,
      Settings,
      UpdateSettings
    ) {

      'ngInject';

      $scope.configuration = model.translation;
      // remove translations with falsey locales
      $scope.configuration.translations = _.filter($scope.configuration.translations, function(translation) {
        return translation.locale;
      });
      $scope.locales = model.locales;
      $scope.localeNames = {};
      model.locales.forEach(function(locale) {
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
        var leaf = objectpath.get(updated, $scope.configuration.path);
        leaf.message = $scope.configuration.translations;
        $q(function(resolve, reject) {
          UpdateSettings(updated, function(err) {
            if (err) {
              return reject(err);
            }
            resolve();
          });
        });
      };

      $scope.submit = function() {
        var pane = modal.start($('#edit-translation-messages'));
        return Settings()
          .then(updateTranslation)
          .then(function() {
            pane.done();
            $uibModalInstance.close('ok');
          })
          .catch(function(err) {
            $translate('Error updating settings').then(function(message) {
              pane.done(message, err);
            });
        });
      };

      $scope.cancel = function() {
        $uibModalInstance.dismiss('cancel');
      };

    }
  );

}());
