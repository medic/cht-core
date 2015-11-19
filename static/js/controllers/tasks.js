var _ = require('underscore');

(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('TasksCtrl',
    ['$scope', '$state', '$log', '$timeout', 'TranslateFrom', 'TaskGenerator',
    function ($scope, $state, $log, $timeout, TranslateFrom, TaskGenerator) {

      var setSelectedTask = function(task) {
        $scope.selected = task;
        $scope.setTitle(TranslateFrom(task.title, task));
        $scope.setShowContent(true);
      };

      $scope.setSelected = function(id) {
        var refreshing = ($scope.selected && $scope.selected._id) === id,
            task = _.findWhere($scope.tasks, { _id: id });
        if (task) {
          $scope.settingSelected(refreshing);
          setSelectedTask(task);
        } else {
          $scope.clearSelected();
        }
      };

      var mergeTasks = function(tasks) {
        $timeout(function() {
          tasks.forEach(function(task) {
            if ($scope.selected && task._id === $scope.selected._id ||
               (!$scope.selected && task._id === $state.params.id)) {
              setSelectedTask(task);
            }
            for (var i = 0; i < $scope.tasks.length; i++) {
              if ($scope.tasks[i]._id === task._id) {
                $scope.tasks[i] = task;
                return;
              }
            }
            $scope.tasks.push(task);
          });

          // Remove any tasks which no longer exist
          if($scope.tasks.length > tasks.length) {
            var newIds = _.pluck(tasks, '_id');
            $scope.tasks = _.filter($scope.tasks, function(task) {
              return _.contains(newIds, task._id);
            });
          }
        });
      };

      $scope.$on('ClearSelected', function() {
        $scope.selected = null;
      });

      $scope.filterModel.type = 'tasks';
      $scope.tasks = [];
      $scope.selected = null;
      $scope.loading = true;
      $scope.error = false;

      TaskGenerator('TasksCtrl', function(err, tasks) {
        $scope.loading = false;
        if (err) {
          $log.error('Error getting tasks', err);
          $scope.error = true;
          $scope.tasks = [];
          $scope.clearSelected();
          return;
        }
        mergeTasks(tasks);
      });
    }
  ]);

}());
