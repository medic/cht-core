angular.module('inboxControllers').controller('TourSelectCtrl',
  function(
    $uibModalInstance,
    Tour
  ) {

    'use strict';
    'ngInject';

    const ctrl = this;

    Tour.endCurrent();
    Tour.getTours().then(function(tours) {
      ctrl.tours = tours;
    });

    ctrl.start = function(name) {
      Tour.start(name);
      $uibModalInstance.close();
    };

    ctrl.cancel = function() {
      $uibModalInstance.close();
    };

  }
);
