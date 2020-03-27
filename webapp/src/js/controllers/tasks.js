(function () {

  'use strict';
  angular.module('inboxControllers').controller('TasksCtrl', function(
    $log,
    $ngRedux,
    $scope,
    $stateParams,
    $window,
    Changes,
    ContactTypes,
    Debounce,
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
        setTasksLoaded: tasksActions.setTasksLoaded,
      };
    };
    const unsubscribe = $ngRedux.connect(mapStateToTarget, mapDispatchToTarget)(ctrl);

    ctrl.refreshTaskList = function() {
      $window.location.reload();
    };

    ctrl.setSelectedTask(null);
    ctrl.error = false;
    ctrl.hasTasks = false;
    ctrl.loading = true;

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
      changesFeed.unsubscribe();
      unsubscribe();
    });

    const refreshTasks = () => RulesEngine.isEnabled()
      .then(isEnabled => {
        ctrl.tasksDisabled = !isEnabled;
        return isEnabled ? RulesEngine.fetchTaskDocsForAllContacts() : [];
      })
      .then(taskDocs => {
        ctrl.hasTasks = taskDocs.length > 0;
        ctrl.loading = false;
        LiveList.tasks.set(taskDocs.map(doc => doc.emission));
      })
      .catch(err => {
        $log.error('Error getting tasks for all contacts', err);

        const notifyError = LiveList.tasks.notifyError;
        if (notifyError) {
          notifyError();
        }

        ctrl.error = true;
        ctrl.loading = false;
        ctrl.hasTasks = false;
        LiveList.tasks.set([]);
      });

    const isReport = doc => doc.type === 'data_record' && !!doc.form;
    const changesFeed = Changes({
      key: 'refresh-task-list',
      filter: change => !!change.doc && (
        ContactTypes.includes(change.doc) ||
        isReport(change.doc) ||
        change.doc.type === 'task'
      ),
      callback: () => {
        debouncedReload.cancel();
        return debouncedReload();
      },
    });

    const debouncedReload = Debounce(refreshTasks, 1000, 10 * 1000);
    ctrl.setTasksLoaded(refreshTasks());
  });
}());
