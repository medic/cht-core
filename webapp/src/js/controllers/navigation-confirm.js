angular.module('inboxControllers').controller('NavigationConfirmCtrl',
  function (
    $scope,
    $state,
    $uibModalInstance
  ) {

    'use strict';
    'ngInject';

    $scope.cancel = function() {
      $uibModalInstance.dismiss();
      if ($state.current.name.includes('report')) {
        $('div.material').removeClass('ng-hide');
      }
    };

    $scope.submit = function() {
      $uibModalInstance.close();
    };

  }
);
