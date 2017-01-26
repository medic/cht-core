angular.module('inboxControllers').controller('WelcomeModalCtrl',
  function(
    $scope,
    $uibModalInstance
  ) {

    'ngInject';
    'use strict';

    $scope.start = function() {
      $uibModalInstance.dismiss();
    };
  }
);
