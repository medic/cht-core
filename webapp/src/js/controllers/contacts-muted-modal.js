angular.module('inboxControllers').controller('ContactsMutedModalCtrl',
  function(
    $scope,
    $translate,
    $uibModalInstance
  ) {
    'use strict';
    'ngInject';

    $scope.submit = function() {
      $uibModalInstance.close();
    };

    $scope.cancel = function() {
      $uibModalInstance.dismiss();
    };
  }
);
