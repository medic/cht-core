(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('TasksCtrl',
    ['$scope', '$timeout', 'TaskGenerator',
    function ($scope, $timeout, TaskGenerator) {

      var _selectedId;

      $scope.setSelectedId = function(id) {
        _selectedId = id;
        selectItem();
      };

      var selectItem = function() {
        if (_selectedId) {
          $scope.items.forEach(function(item) {
            if (item._id === _selectedId) {
              $scope.setSelected(item);
            }
          });
        } else {
          $scope.setSelected();
        }
      };

      var updateTasks = function() {
        $scope.loading = true;
        $scope.error = false;
        TaskGenerator()
          .then(function(tasks) {
            $timeout(function() {
              $scope.setTasks(tasks);
              $scope.loading = false;
              selectItem();
            });
          })
          .catch(function(err) {
            console.log('Error generating tasks', err);
            $scope.loading = false;
            $scope.error = true;
            $scope.setTasks();
          });
      };

      $scope.setSelectedModule();
      $scope.filterModel.type = 'tasks';
      $scope.setTasks();
      updateTasks();
    }
  ]);

}());