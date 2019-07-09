const moment = require('moment');

angular.module('inboxControllers').controller('ContactsContentCtrl',
  function(
    $log,
    $ngRedux,
    $scope,
    $state,
    $stateParams,
    $translate,
    Changes,
    ContactChangeFilter,
    ContactViewModelGenerator,
    ContactsActions,
    Debounce,
    Selectors,
    Snackbar,
    UserSettings
  ) {

    'use strict';
    'ngInject';

    const ctrl = this;
    const mapStateToTarget = function(state) {
      return {
        selectedContact: Selectors.getSelectedContact(state),
        loadingContent: Selectors.getLoadingContent(state),
        loadingSelectedContactChildren: Selectors.getLoadingSelectedContactChildren(state),
        loadingSelectedContactReports: Selectors.getLoadingSelectedContactReports(state),
        contactsLoadingSummary: Selectors.getContactsLoadingSummary(state)
      };
    };
    const mapDispatchToTarget = function(dispatch) {
      const contactsActions = ContactsActions(dispatch);
      return {
        updateSelectedContact: contactsActions.updateSelectedContact
      };
    };
    const unsubscribe = $ngRedux.connect(mapStateToTarget, mapDispatchToTarget)(ctrl);

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
          var refreshing = (ctrl.selectedContact && ctrl.selectedContact.doc._id) === id;
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
        return ContactChangeFilter.matchContact(change, ctrl.selectedContact) ||
               ContactChangeFilter.isRelevantContact(change, ctrl.selectedContact) ||
               ContactChangeFilter.isRelevantReport(change, ctrl.selectedContact);
      },
      callback: function(change) {
        if (ContactChangeFilter.matchContact(change, ctrl.selectedContact) && ContactChangeFilter.isDeleted(change)) {
          debouncedReloadContact.cancel();
          var parentId = ctrl.selectedContact.doc.parent && ctrl.selectedContact.doc.parent._id;
          if (parentId) {
            // redirect to the parent
            return $state.go($state.current.name, {id: parentId});
          } else {
            // top level contact deleted - clear selection
            return $scope.clearSelected();
          }
        }
        return debouncedReloadContact(ctrl.selectedContact.doc._id, true);
      }
    });

    $scope.$on('$destroy', function() {
      unsubscribe();
      changeListener.unsubscribe();
      debouncedReloadContact.cancel();
    });
  }
);
