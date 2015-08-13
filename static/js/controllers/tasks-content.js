(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('TasksContentCtrl', 
    ['$scope', '$stateParams',
    function ($scope, $stateParams) {
      $scope.setSelectedId($stateParams.id);
    }
  ]);

}());
