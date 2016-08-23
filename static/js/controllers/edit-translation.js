var _ = require('underscore');

(function () {

  'use strict';

  angular.module('inboxControllers').controller('EditTranslationCtrl',
    function (
      $scope,
      $uibModalInstance,
      DB
    ) {

      'ngInject';

      $scope.key = $scope.model.key;
      $scope.editing = !!$scope.model.key;
      $scope.locales = _.pluck($scope.model.locales, 'doc');
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
        $scope.setProcessing();
        var updated = getUpdatedLocales();
        if (!updated.length) {
          $scope.setFinished();
          $uibModalInstance.close();
        } else {
          DB().bulkDocs(updated)
            .then(function() {
              $scope.setFinished();
              $uibModalInstance.close();
            })
            .catch(function(err) {
              $scope.setError(err, 'Error updating settings');
            });
        }
      };

      $scope.cancel = function() {
        $uibModalInstance.dismiss();
      };

    }
  );

}());