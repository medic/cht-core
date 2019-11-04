(function () {

  'use strict';
  angular.module('inboxControllers').controller('TasksCtrl', function(
    $log,
    $ngRedux,
    $q,
    $scope,
    $state,
    $stateParams,
    $window,
    Changes,
    ContactTypes,
    DB,
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
        currentTab: Selectors.getCurrentTab(state),
        selectedTask: Selectors.getSelectedTask(state)
      };
    };
    const mapDispatchToTarget = function(dispatch) {
      const globalActions = GlobalActions(dispatch);
      const tasksActions = TasksActions(dispatch);
      return {
        setSelectedTask: tasksActions.setSelectedTask,
        setShowContent: globalActions.setShowContent,
        setTitle: globalActions.setTitle,
        settingSelected: globalActions.settingSelected
      };
    };
    const unsubscribe = $ngRedux.connect(mapStateToTarget, mapDispatchToTarget)(ctrl);

    $scope.setSelected = function(id) {
      if (!id) {
        LiveList.tasks.clearSelected();
        $scope.clearSelected();
        return;
      }
      
      return promiseToLoad.then(function () {
        const task = LiveList.tasks.getList().find(taskEmission => taskEmission. _id === id);
        if (task) {
          const refreshing = (ctrl.selectedTask && ctrl.selectedTask._id) === id;
          ctrl.settingSelected(refreshing);
          return setSelectedTask(task);
        }
      });
    };

    $scope.$on('ClearSelected', () => ctrl.setSelectedTask(null));
    $scope.$on('query', function() {
      if (ctrl.currentTab !== 'tasks') {
        LiveList.tasks.clearSelected();
        delete LiveList.tasks.notifyChange;
        delete LiveList.tasks.notifyError;
        return;
      }
    });
    $scope.$on('$destroy', () => {
      unsubscribe();
      changesFeed.unsubscribe();
    });

    ctrl.refreshTaskList = $window.location.reload;
    ctrl.setSelectedTask(null);
    ctrl.error = false;
    ctrl.hasTasks = false;
    ctrl.loading = true;

    LiveList.tasks.notifyChange = function(task) {
      ctrl.hasTasks = LiveList.tasks.count() > 0;
      if (ctrl.selectedTask && task._id === ctrl.selectedTask._id ||
          (!ctrl.selectedTask && task._id === $state.params.id)) {
        setSelectedTask(task);
      }
    };
    LiveList.tasks.notifyError = function() {
      ctrl.error = true;
      $scope.clearSelected();
    };

    if ($stateParams.tour) {
      Tour.start($stateParams.tour);
    }

    const isReport = doc => doc.type === 'data_record' && !!doc.form;
    const changesFeed = Changes({
      key: 'refresh-task-list',
      filter: change => !!change.doc && (ContactTypes.includes(change.doc) || isReport(change.doc) || change.doc.type === 'task'),
      callback: () => {
        debouncedReload.cancel();
        return debouncedReload();
      },
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
        $log.error('Error getting tasks', err);

        const notifyError = LiveList.tasks.notifyError;
        if (notifyError) {
          notifyError();
        }

        ctrl.error = true;
        ctrl.loading = false;
        ctrl.hasTasks = false;
        LiveList.tasks.set([]);
      });
    const debouncedReload = Debounce(refreshTasks, 1000, 10 * 1000);
    const promiseToLoad = refreshTasks();

    const hydrateTaskEmission = function(task) {
      if (!Array.isArray(task.actions) || task.actions.length === 0 || !task.forId) {
        return $q.resolve(task);
      }

      return DB().get(task.forId)
        .then(contactDoc => {
          for (let action of task.actions) {
            if (!action.content) {
              action.content = {};
            }

            if (!action.content.contact) {
              action.content.contact = contactDoc;
            }
          }

          return task;
        })
        .catch(err => {
          $log.error('Failed to hydrate contact information in task action', err);
          return task;
        });
    };

    const setSelectedTask = function(task) {
      LiveList.tasks.setSelected(task._id);
      ctrl.setTitle(task.title);
      ctrl.setShowContent(true);
      debouncedReload.cancel();
      return hydrateTaskEmission(task).then(hydratedTask => {
        ctrl.setSelectedTask(hydratedTask);
      });
    };
  });
}());
