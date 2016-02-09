var _ = require('underscore');

(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('TasksCtrl',
    ['$scope', '$state', '$log', '$timeout', 'LiveList', 'TranslateFrom', 'TaskGenerator',
    function ($scope, $state, $log, $timeout, LiveList, TranslateFrom, TaskGenerator) {

      var setSelectedTask = function(task) {
        $scope.selected = task;
        $scope.setTitle(TranslateFrom(task.title, task));
        $scope.setShowContent(true);
      };

      $scope.setSelected = function(id) {
        var refreshing = ($scope.selected && $scope.selected._id) === id,
            task = _.findWhere(LiveList.tasks.getList(), { _id: id });
        if (task) {
          $scope.settingSelected(refreshing);
          setSelectedTask(task);
        } else {
          $scope.clearSelected();
        }
      };

      $scope.refreshTaskList = function() {
        window.location.reload();
      };

      var mergeTasks = function(tasks) {
        $timeout(function() {
          tasks.forEach(function(task) {
            if ($scope.selected && task._id === $scope.selected._id ||
               (!$scope.selected && task._id === $state.params.id)) {
              setSelectedTask(task);
            }

            if (task.resolved) {
              LiveList.tasks.remove(task);
            } else {
              LiveList.tasks.update(task);
            }
          });
        })
        .then(function() {
          $scope.loading = false;
        });
      };

      $scope.$on('ClearSelected', function() {
        $scope.selected = null;
      });

      $scope.filterModel.type = 'tasks';
      LiveList.tasks.scope = $scope;
      if (!LiveList.tasks.initialised()) {
        LiveList.tasks.set([]);
      } else {
        $timeout(function() {
          LiveList.tasks.refresh();
        });
      }
      $scope.selected = null;
      $scope.loading = true;
      $scope.error = false;

      TaskGenerator('TasksCtrl', function(err, tasks) {
        if (err) {
          $log.error('Error getting tasks', err);
          $scope.loading = false;
          $scope.error = true;
          LiveList.tasks.set([]);
          $scope.clearSelected();
          return;
        }
        mergeTasks(tasks);
      });
    }
  ]);

}());
