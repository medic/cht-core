angular.module('inboxControllers').controller('CheckDateCtrl',
  function (
    $scope,
    $uibModalInstance
  ) {

    'use strict';
    'ngInject';

    $scope.ok = function() {
      $uibModalInstance.close();
    };

  }
);
