const moment = require('moment');

angular.module('inboxControllers').controller('ContactsContentCtrl',
  function(
    $log,
    $ngRedux,
    $scope,
    $state,
    $stateParams,
    $translate,
    Actions,
    Changes,
    ContactChangeFilter,
    ContactViewModelGenerator,
    Debounce,
    Selectors,
    Snackbar,
    UserSettings
  ) {

    'use strict';
    'ngInject';

    var ctrl = this;
    var mapStateToTarget = function(state) {
      return {
        selected: Selectors.getSelected(state),
        loadingSelectedChildren: Selectors.getLoadingSelectedChildren(state),
        loadingSelectedReports: Selectors.getLoadingSelectedReports(state)
      };
    };
    var mapDispatchToTarget = function(dispatch) {
      var actions = Actions(dispatch);
      return {
        updateSelected: actions.updateSelected
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

    var selectContact = function(id, silent) {
      if (!silent) {
        $scope.setLoadingContent(id);
      }

      var options = { getChildPlaces: !usersHomePlaceId || usersHomePlaceId !== id };
      return ContactViewModelGenerator.getContact(id, options)
        .then(function(model) {
          var refreshing = (ctrl.selected && ctrl.selected.doc._id) === id;
          $scope.setSelected(model, options);
          $scope.settingSelected(refreshing);
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
