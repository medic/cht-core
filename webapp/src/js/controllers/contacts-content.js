var _ = require('underscore'),
    moment = require('moment');

angular.module('inboxControllers').controller('ContactsContentCtrl',
  function(
    $log,
    $ngRedux,
    $q,
    $scope,
    $state,
    $stateParams,
    $translate,
    Actions,
    Auth,
    Changes,
    ContactViewModelGenerator,
    Selectors,
    Snackbar,
    TasksForContact,
    TranslateFrom,
    UserSettings,
    ContactChangeFilter,
    Debounce
  ) {

    'use strict';
    'ngInject';

    var ctrl = this;
    var mapStateToTarget = function(state) {
      return {
        selected: Selectors.getSelected(state),
      };
    };
    var mapDispatchToTarget = function(dispatch) {
      var actions = Actions(dispatch);
      return {
        setSelectedTasks: actions.setSelectedTasks,
        setSelectedAreTasksEnabled: actions.setSelectedAreTasksEnabled
      };
    };
    var unsubscribe = $ngRedux.connect(mapStateToTarget, mapDispatchToTarget)(ctrl);

    var taskEndDate,
        reportStartDate,
        usersHomePlaceId;

    $scope.filterTasks = function(task) {
      return !taskEndDate || taskEndDate.isAfter(task.date);
    };
    $scope.filterReports = function(report) {
      return !reportStartDate || reportStartDate.isBefore(report.reported_date);
    };

    $scope.setReportsTimeWindowMonths = function(months) {
      $scope.reportsTimeWindowMonths = months;
      reportStartDate = months ? moment().subtract(months, 'months') : null;
    };

    $scope.setTasksTimeWindowWeeks = function(weeks) {
      $scope.tasksTimeWindowWeeks = weeks;
      taskEndDate = weeks ? moment().add(weeks, 'weeks') : null;
    };

    $scope.setTasksTimeWindowWeeks(1);
    $scope.setReportsTimeWindowMonths(3);

    var getHomePlaceId = function() {
      return UserSettings()
        .then(function(user) {
          return user && user.facility_id;
        })
        .catch(function(err) {
          $log.error('Error fetching user settings', err);
        });
    };

    var translate = function(value, task) {
      if (_.isString(value)) {
        // new translation key style
        return $translate.instant(value, task);
      }
      // old message array style
      return TranslateFrom(value, task);
    };

    var getTasks = function() {
      return Auth('can_view_tasks')
        .then(function() {
          ctrl.setSelectedTasks([]);
          var children = ctrl.selected.children.persons || [];
          TasksForContact(
            ctrl.selected.doc._id,
            ctrl.selected.doc.type,
            _.pluck(children, 'id'),
            'ContactsContentCtrl',
            function(areTasksEnabled, tasks) {
              if (ctrl.selected) {
                tasks.forEach(function(task) {
                  task.title = translate(task.title, task);
                  task.priorityLabel = translate(task.priorityLabel, task);
                });
                ctrl.setSelectedAreTasksEnabled(areTasksEnabled);
                ctrl.setSelectedTasks(tasks);
                children.forEach(function(child) {
                  child.taskCount = tasks.filter(function(task) {
                    return task.doc &&
                           task.doc.contact &&
                           task.doc.contact._id === child.doc._id;
                  }).length;
                });
                if (!$scope.$$phase) {
                  $scope.$apply();
                }
              }
            });
        })
        .catch(function() {
          $log.debug('Not authorized to view tasks');
        });
    };

    var selectContact = function(id, silent) {
      if (!silent) {
        $scope.setLoadingContent(id);
      }

      return ContactViewModelGenerator(id, { getChildPlaces: !usersHomePlaceId || usersHomePlaceId !== id })
        .then(function(model) {
          var refreshing = (ctrl.selected && ctrl.selected.doc._id) === id;
          $scope.setSelected(model);
          $scope.settingSelected(refreshing);
          return getTasks();
        })
        .catch(function(err) {
          if (err.code === 404 && !silent) {
            $translate('error.404.title').then(Snackbar);
          }
          $scope.clearSelected();
          $log.error('Error generating contact view model', err, err.message);
        });
    };

    // exposed solely for testing purposes
    this.setupPromise = getHomePlaceId().then(function(id) {
      usersHomePlaceId = id;

      if ($stateParams.id) {
        return selectContact($stateParams.id);
      }
      $scope.clearSelected();
      if ($scope.isMobile()) {
        return;
      }
      if (id) {
        return selectContact(id, true);
      }
    });

    var debouncedReloadContact = Debounce(selectContact, 1000, 10 * 1000);

    var changeListener = Changes({
      key: 'contacts-content',
      filter: function(change) {
        return ContactChangeFilter.matchContact(change, ctrl.selected) ||
               ContactChangeFilter.isRelevantContact(change, ctrl.selected) ||
               ContactChangeFilter.isRelevantReport(change, ctrl.selected);
      },
      callback: function(change) {
        if (ContactChangeFilter.matchContact(change, ctrl.selected) && ContactChangeFilter.isDeleted(change)) {
          debouncedReloadContact.cancel();
          var parentId = ctrl.selected.doc.parent && ctrl.selected.doc.parent._id;
          if (parentId) {
            // redirect to the parent
            return $state.go($state.current.name, {id: parentId});
          } else {
            // top level contact deleted - clear selection
            return $scope.clearSelected();
          }
        }
        return debouncedReloadContact(ctrl.selected.doc._id, true);
      }
    });

    $scope.$on('$destroy', function() {
      unsubscribe();
      changeListener.unsubscribe();
      debouncedReloadContact.cancel();
    });
  }
);
