/*
Controller for the Modal service which executes window.reload when submitted.
*/
angular.module('inboxControllers').controller('ReloadingModalCtrl',
  function (
    $scope,
    $uibModalInstance,
    $window
  ) {

    'use strict';
    'ngInject';

    $scope.submit = function() {
      $uibModalInstance.close();
      $window.location.reload();
    };

    $scope.cancel = function() {
      $uibModalInstance.dismiss();
    };

  }
);
