var _ = require('underscore');

(function () {

  'use strict';

  angular.module('inboxControllers').controller('TasksCtrl',
    function(
      $ngRedux,
      $scope,
      $state,
      $stateParams,
      $timeout,
      $translate,
      $window,
      GlobalActions,
      LiveList,
      RulesEngine,
      Selectors,
      TasksActions,
      Tour,
      TranslateFrom
    ) {
      'ngInject';

      const ctrl = this;
      const mapStateToTarget = function(state) {
        return {
          currentTab: Selectors.getCurrentTab(state),
          selectedTask: Selectors.getSelectedTask(state)
        };
      };
      const mapDispatchToTarget = function(dispatch) {
        const globalActions = GlobalActions(dispatch);
        const tasksActions = TasksActions(dispatch);
        return {
          unsetSelected: globalActions.unsetSelected,
          setSelectedTask: tasksActions.setSelectedTask,
          setShowContent: globalActions.setShowContent,
          setTitle: globalActions.setTitle,
          settingSelected: globalActions.settingSelected
        };
      };
      const unsubscribe = $ngRedux.connect(mapStateToTarget, mapDispatchToTarget)(ctrl);

      var setSelectedTask = function(task) {
        LiveList.tasks.setSelected(task._id);
        ctrl.setSelectedTask(task);
        if (_.isString(task.title)) {
          // new translation key style
          task.title = $translate.instant(task.title, task);
        } else {
          // old message array style
          task.title = TranslateFrom(task.title, task);
        }
        ctrl.setTitle(TranslateFrom(task.title, task));
        ctrl.setShowContent(true);
      };

      $scope.setSelected = function(id) {
        if (!id) {
          LiveList.tasks.clearSelected();
          ctrl.unsetSelected();
          return;
        }
        var task = _.findWhere(LiveList.tasks.getList(), { _id: id });
        if (task) {
          var refreshing = (ctrl.selectedTask && ctrl.selectedTask._id) === id;
          ctrl.settingSelected(refreshing);
          setSelectedTask(task);
        }
      };

      ctrl.refreshTaskList = function() {
        $window.location.reload();
      };

      $timeout(function() {
        LiveList.tasks.refresh();
      });
      ctrl.setSelectedTask(null);
      ctrl.error = false;
      ctrl.hasTasks = LiveList.tasks.count() > 0;
      ctrl.tasksDisabled = !RulesEngine.enabled;
      ctrl.loading = true;

      RulesEngine.complete.then(function() {
        $timeout(function() {
          ctrl.loading = false;
        });
      });

      LiveList.tasks.notifyChange = function(task) {
        ctrl.hasTasks = LiveList.tasks.count() > 0;
        if (ctrl.selectedTask && task._id === ctrl.selectedTask._id ||
            (!ctrl.selectedTask && task._id === $state.params.id)) {
          setSelectedTask(task);
        }
      };
      LiveList.tasks.notifyError = function() {
        ctrl.error = true;
        ctrl.unsetSelected();
      };

      $scope.$on('query', function() {
        if (ctrl.currentTab !== 'tasks') {
          LiveList.tasks.unsetSelected();
          delete LiveList.tasks.notifyChange;
          delete LiveList.tasks.notifyError;
          return;
        }
      });

      if ($stateParams.tour) {
        Tour.start($stateParams.tour);
      }

      $scope.$on('$destroy', unsubscribe);
    }
  );

}());
