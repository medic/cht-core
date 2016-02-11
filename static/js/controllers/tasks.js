var _ = require('underscore');

(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('TasksCtrl',
    ['$scope', '$state', '$log', '$timeout', 'LiveList', 'TranslateFrom',
    function ($scope, $state, $log, $timeout, LiveList, TranslateFrom) {

      var setSelectedTask = function(task) {
        LiveList.tasks.setSelected(task._id);
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

      $scope.$on('ClearSelected', function() {
        $scope.selected = null;
      });

      $scope.filterModel.type = 'tasks';
      $timeout(function() {
        LiveList.tasks.refresh();
      });
      $scope.selected = null;
      $scope.error = false;
      $scope.hasTasks = LiveList.tasks.count() > 0;

      LiveList.tasks.notifyChange = function(task) {
        $scope.hasTasks = LiveList.tasks.count() > 0;
        if ($scope.selected && task._id === $scope.selected._id ||
            (!$scope.selected && task._id === $state.params.id)) {
          setSelectedTask(task);
        }
      };
      LiveList.tasks.notifyError = function() {
        $scope.error = true;
        $scope.clearSelected();
      };

      $scope.$on('query', function() {
        if ($scope.filterModel.type !== 'tasks') {
          LiveList.tasks.clearSelected();
          delete LiveList.tasks.notifyChange;
          delete LiveList.tasks.notifyError;
          return;
        }
      });

    }
  ]);

}());
