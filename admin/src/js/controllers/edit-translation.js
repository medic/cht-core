var _ = require('underscore');

angular.module('controllers').controller('EditTranslationCtrl',
  function (
    $scope,
    $uibModalInstance,
    DB
  ) {

    'use strict';
    'ngInject';

    $scope.editing = !!$scope.model.key;
    $scope.model.locales = _.pluck($scope.model.locales, 'doc');
    $scope.model.values = {};

    $scope.model.locales.forEach(function(locale) {
      var value = $scope.model.key ? locale.values[$scope.model.key] : null;
      $scope.model.values[locale.code] = value;
    });

    var getUpdatedLocales = function() {
      return _.filter($scope.model.locales, function(locale) {
        var newValue = $scope.model.values[locale.code];
        if (
          !$scope.editing ||
          ($scope.editing && locale.values[$scope.model.key] !== newValue)
        ) {
          locale.values[$scope.model.key] = newValue;
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
