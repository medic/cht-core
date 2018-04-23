angular.module('inboxControllers').controller('VersionUpdateCtrl',
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
