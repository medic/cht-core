angular.module('inboxControllers').controller('NavigationConfirmCtrl',
  function (
    $scope,
    $rootScope,
    $uibModalInstance
  ) {

    'use strict';
    'ngInject';

    $scope.cancel = function() {
      $uibModalInstance.dismiss();
    };

    $scope.submit = function() {
      $uibModalInstance.close();
      $rootScope.$broadcast('unmarkLinks');
    };

  }
);
