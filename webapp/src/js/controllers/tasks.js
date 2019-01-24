var _ = require('underscore');

(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('TasksCtrl',
    function(
      $scope,
      $state,
      $stateParams,
      $timeout,
      $translate,
      LiveList,
      RulesEngine,
      Tour,
      TranslateFrom
    ) {
      'ngInject';

      var setSelectedTask = function(task) {
        LiveList.tasks.setSelected(task._id);
        $scope.selected = task;
        if (_.isString(task.title)) {
          // new translation key style
          task.title = $translate.instant(task.title, task);
        } else {
          // old message array style
          task.title = TranslateFrom(task.title, task);
        }
        $scope.setTitle(TranslateFrom(task.title, task));
        $scope.setShowContent(true);
      };

      $scope.setSelected = function(id) {
        if (!id) {
          LiveList.tasks.clearSelected();
          $scope.clearSelected();
          return;
        }
        var task = _.findWhere(LiveList.tasks.getList(), { _id: id });
        if (task) {
          var refreshing = ($scope.selected && $scope.selected._id) === id;
          $scope.settingSelected(refreshing);
          setSelectedTask(task);
        }
      };

      $scope.refreshTaskList = function() {
        window.location.reload();
      };

      $scope.$on('ClearSelected', function() {
        $scope.selected = null;
      });

      $timeout(function() {
        LiveList.tasks.refresh();
      });
      $scope.selected = null;
      $scope.error = false;
      $scope.hasTasks = LiveList.tasks.count() > 0;
      $scope.tasksDisabled = !RulesEngine.enabled;
      $scope.loading = true;

      RulesEngine.complete.then(function() {
        $timeout(function() {
          $scope.loading = false;
        });
      });

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
        if ($scope.currentTab !== 'tasks') {
          LiveList.tasks.clearSelected();
          delete LiveList.tasks.notifyChange;
          delete LiveList.tasks.notifyError;
          return;
        }
      });

      if ($stateParams.tour) {
        Tour.start($stateParams.tour);
      }
    }
  );

}());
