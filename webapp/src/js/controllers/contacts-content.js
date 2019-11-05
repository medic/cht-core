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
    GlobalActions,
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
      const globalActions = GlobalActions(dispatch);
      return {
        unsetSelected: globalActions.unsetSelected,
        setLoadingShowContent: globalActions.setLoadingShowContent,
        settingSelected: globalActions.settingSelected,
        updateSelectedContact: contactsActions.updateSelectedContact
      };
    };
    const unsubscribe = $ngRedux.connect(mapStateToTarget, mapDispatchToTarget)(ctrl);

    var taskEndDate,
        reportStartDate,
        usersHomePlaceId;

    ctrl.filterTasks = function(task) {
      return !taskEndDate || taskEndDate.isAfter(task.date);
    };
    ctrl.filterReports = function(report) {
      return !reportStartDate || reportStartDate.isBefore(report.reported_date);
    };

    ctrl.setReportsTimeWindowMonths = function(months) {
      ctrl.reportsTimeWindowMonths = months;
      reportStartDate = months ? moment().subtract(months, 'months') : null;
    };

    ctrl.setTasksTimeWindowWeeks = function(weeks) {
      ctrl.tasksTimeWindowWeeks = weeks;
      taskEndDate = weeks ? moment().add(weeks, 'weeks') : null;
    };

    ctrl.setTasksTimeWindowWeeks(1);
    ctrl.setReportsTimeWindowMonths(3);

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
        ctrl.setLoadingShowContent(id);
      }

      var options = { getChildPlaces: !usersHomePlaceId || usersHomePlaceId !== id };
      return ContactViewModelGenerator.getContact(id, options)
        .then(function(model) {
          var refreshing = (ctrl.selectedContact && ctrl.selectedContact.doc._id) === id;
          $scope.setSelected(model, options);
          ctrl.settingSelected(refreshing);
        })
        .catch(function(err) {
          if (err.code === 404 && !silent) {
            $translate('error.404.title').then(Snackbar);
          }
          ctrl.unsetSelected();
          $log.error('Error generating contact view model', err, err.message);
        });
    };

    // exposed solely for testing purposes
    this.setupPromise = getHomePlaceId().then(function(id) {
      usersHomePlaceId = id;

      if ($stateParams.id) {
        return selectContact($stateParams.id);
      }
      ctrl.unsetSelected();
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
          const parentId = ctrl.selectedContact.doc.parent && ctrl.selectedContact.doc.parent._id;
          return $state.go('contacts.detail', { id: parentId || null });
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
