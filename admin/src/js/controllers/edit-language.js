const _ = require('lodash/core');

angular.module('controllers').controller('EditLanguageCtrl',
  function (
    $scope,
    $translate,
    $uibModalInstance,
    DB
  ) {

    'use strict';
    'ngInject';

    const validate = function(model) {
      let errors = null;
      if (!model.name) {
        errors = errors || {};
        errors.name = $translate.instant('field is required', {
          field: $translate.instant('Name')
        });
      }
      if (!model.code) {
        errors = errors || {};
        errors.code = $translate.instant('field is required', {
          field: $translate.instant('Language code')
        });
      }
      return errors;
    };

    $scope.language = _.clone($scope.model) || {
      enabled: true,
      generic: {},
      custom: {},
      type: 'translations'
    };

    $scope.submit = function() {
      $scope.errors = validate($scope.language);
      if (!$scope.errors) {
        $scope.setProcessing();
        if (!$scope.language._id) {
          $scope.language._id = 'messages-' + $scope.language.code;
        }
        DB().put($scope.language)
          .then(function() {
            $scope.setFinished();
            $uibModalInstance.close();
            $translate.refresh();
          })
          .catch(function(err) {
            $scope.setError(err, 'Error saving settings');
          });
      }
    };

    $scope.cancel = function() {
      $uibModalInstance.dismiss();
    };
  });
