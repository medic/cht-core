angular.module('inboxControllers').controller('CheckDateCtrl',
  function (
    $scope,
    $uibModalInstance,
    model
  ) {

    'use strict';
    'ngInject';

    $scope.model = model;

    $scope.ok = function() {
      $uibModalInstance.close('ok');
    };

  }
);
