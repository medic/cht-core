angular.module('inboxControllers').controller('GenericMessageCtrl',
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
