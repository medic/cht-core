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

      $scope.key = model.key;
      $scope.editing = !!model.key;
      $scope.locales = _.pluck(model.locales, 'doc');
      $scope.values = {};

      $scope.locales.forEach(function(locale) {
        var value = $scope.key ? locale.values[$scope.key] : null;
        $scope.values[locale.code] = value;
      });

      var getUpdatedLocales = function() {
        return _.filter($scope.locales, function(locale) {
          var newValue = $scope.values[locale.code];
          if (
            !$scope.editing ||
            ($scope.editing && locale.values[$scope.key] !== newValue)
          ) {
            locale.values[$scope.key] = newValue;
            return true;
          }
          return false;
        });
      };

      $scope.submit = function() {
        var pane = modal.start($('#edit-translation'));
        var updated = getUpdatedLocales();
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