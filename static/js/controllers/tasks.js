(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('TasksCtrl',
    ['$scope',
    function ($scope) {
      $scope.setSelectedModule();
      $scope.filterModel.type = 'tasks';
      $scope.loading = false;
      $scope.error = null;
      $scope.setTasks([]);
    }
  ]);

}());