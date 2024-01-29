const _ = require('lodash/core');

angular.module('controllers').controller('EditTranslationCtrl',
  function (
    $scope,
    $translate,
    $uibModalInstance,
    DB,
    Translate
  ) {

    'use strict';
    'ngInject';

    $scope.editing = !!$scope.model.key;
    $scope.model.locales = _.map($scope.model.locales, 'doc');
    $scope.model.values = {};
    $scope.errors = {};
    $scope.isCustom = false;

    $scope.model.locales.forEach(function(locale) {
      const custom = locale.custom || {};
      const generic = locale.generic || {};
      const value = $scope.model.key ? custom[$scope.model.key] || generic[$scope.model.key] : null;
      $scope.model.values[locale.code] = value;
      $scope.isCustom = $scope.isCustom || _.has(custom, $scope.model.key);
    });

    const getUpdatedLocales = function() {
      return _.filter($scope.model.locales, function(locale) {
        const newValue = $scope.model.values[locale.code];
        const custom = locale.custom && locale.custom[$scope.model.key];
        const generic = locale.generic && locale.generic[$scope.model.key];

        if (
          (!$scope.editing) || // adding a new translation key
          (custom && !newValue) || // deleting a custom term
          (custom && custom !== newValue) || // updating a custom term
          (!custom && newValue && newValue !== generic) // adding a custom term
        ) {
          if (!locale.custom) {
            locale.custom = {};
          }
          locale.custom[$scope.model.key] = newValue || null;
          return true;
        }
        return false;
      });
    };

    const deleteKeyFromLocales = function() {
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
      if (!$scope.model.key) {
        Translate.fieldIsRequired('translation.key').then(value => {
          $scope.errors.key = value;
          $scope.setError();
        });
        return;
      }
      $scope.setProcessing();
      const updated = getUpdatedLocales();
      if (!updated.length) {
        $scope.setFinished();
        $uibModalInstance.close();
      } else {
        DB().bulkDocs(updated)
          .then(function() {
            $scope.setFinished();
            $uibModalInstance.close();
            $translate.refresh();
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
      const updated = deleteKeyFromLocales();
      if (!updated.length) {
        $scope.setFinished();
        $uibModalInstance.close();
      } else {
        DB().bulkDocs(updated)
          .then(function() {
            $scope.setFinished();
            $uibModalInstance.close();
            $translate.refresh();
          })
          .catch(function(err) {
            $scope.setError(err, 'Error updating settings');
          });
      }
    };

  });
