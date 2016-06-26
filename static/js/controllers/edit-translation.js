var _ = require('underscore'),
    modal = require('../modules/modal');

(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('EditTranslationCtrl',
    function (
      $scope,
      $translate,
      $uibModalInstance,
      DB,
      model
    ) {

      'ngInject';

      var original = {};
      $scope.translationModel = model;
      $scope.translationModel.locales = _.pluck($scope.translationModel.locales, 'doc');
      $scope.translationModel.locales.forEach(function(locale) {
        original[locale.code] = locale.values[model.key];
      });

      $scope.submit = function() {
        var pane = modal.start($('#edit-translation'));
        var updated = _.filter($scope.translationModel.locales, function(locale) {
          return original[locale.code] !== locale.values[model.key];
        });
        if (!updated.length) {
          pane.done();
          $uibModalInstance.close('ok');
        } else {
          DB().bulkDocs(updated)
            .then(function() {
              pane.done();
              $uibModalInstance.close('ok');
            })
            .catch(function(err) {
              $translate('Error updating settings').then(function(message) {
                pane.done(message, err);
              });
            });
        }
      };

      $scope.cancel = function() {
        $uibModalInstance.dismiss('cancel');
      };

    }
  );

}());