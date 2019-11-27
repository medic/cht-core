(function () {

  'use strict';

  angular.module('inboxControllers').controller('TasksCtrl',
    function(
      $ngRedux,
      $scope,
      $stateParams,
      $timeout,
      $window,
      GlobalActions,
      LiveList,
      RulesEngine,
      Selectors,
      TasksActions,
      Tour
    ) {
      'ngInject';

      const ctrl = this;
      const mapStateToTarget = function(state) {
        return {
          selectedTask: Selectors.getSelectedTask(state)
        };
      };
      const mapDispatchToTarget = function(dispatch) {
        const globalActions = GlobalActions(dispatch);
        const tasksActions = TasksActions(dispatch);
        return {
          unsetSelected: globalActions.unsetSelected,
          setSelectedTask: tasksActions.setSelectedTask,
        };
      };
      const unsubscribe = $ngRedux.connect(mapStateToTarget, mapDispatchToTarget)(ctrl);

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

      LiveList.tasks.notifyChange = function() {
        ctrl.hasTasks = LiveList.tasks.count() > 0;
      };
      LiveList.tasks.notifyError = function() {
        ctrl.error = true;
        ctrl.unsetSelected();
      };

      if ($stateParams.tour) {
        Tour.start($stateParams.tour);
      }

      $scope.$on('$destroy', () => {
        LiveList.tasks.clearSelected();
        delete LiveList.tasks.notifyChange;
        delete LiveList.tasks.notifyError;
        unsubscribe();
      });
    }
  );

}());
