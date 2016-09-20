angular.module('inboxControllers').controller('TourSelectCtrl',
  function(
    $scope,
    $state,
    $translate,
    $uibModalInstance,
    Tour
  ) {

    'use strict';
    'ngInject';

    Tour.endCurrent();
    Tour.getTours().then(function(tours) {
      $scope.tours = tours;
    });

    $scope.start = function(name) {
      Tour.start(name);
      $uibModalInstance.close();
    };

    $scope.cancel = function() {
      $uibModalInstance.close();
    };

  }
);
