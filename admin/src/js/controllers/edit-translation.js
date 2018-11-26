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
      const custom = locale.custom || {};
      const generic = locale.generic || {};
      var value = $scope.model.key ? custom[$scope.model.key] || generic[$scope.model.key] : null;
      $scope.model.values[locale.code] = value;
    });

    var getUpdatedLocales = function() {
      return _.filter($scope.model.locales, function(locale) {
        var newValue = $scope.model.values[locale.code];
        const custom = locale.custom || {};
        const generic = locale.generic || {};
        if (
          !$scope.editing ||
          ($scope.editing && custom[$scope.model.key] && custom[$scope.model.key] !== newValue) ||
          ($scope.editing && !custom[$scope.model.key] && generic[$scope.model.key] && generic[$scope.model.key] !== newValue)
        ) {
          if (!locale.custom) {
            locale.custom = {};
          }

          locale.custom[$scope.model.key] = newValue;
          return true;
        }
        return false;
      });
    };

    var deleteKeyFromLocales = function() {
      return _.filter($scope.model.locales, function(locale) {
        const custom = locale.custom || {};
        if (
          !$scope.editing ||
          ($scope.editing && custom[$scope.model.key])
        ) {
          delete locale.custom[$scope.model.key];
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

    $scope.delete = function() {
      $scope.setProcessing();
      var updated = deleteKeyFromLocales();
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

  }
);
