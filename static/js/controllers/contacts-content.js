var _ = require('underscore'),
    moment = require('moment');

angular.module('inboxControllers').controller('ContactsContentCtrl',
  function(
    $log,
    $q,
    $scope,
    $stateParams,
    Changes,
    ContactViewModelGenerator,
    Snackbar,
    TasksForContact,
    UserSettings
  ) {

    'use strict';
    'ngInject';

    var taskEndDate,
        reportStartDate;

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

    var getTasks = function() {
      $scope.selected.tasks = [];
      var children = $scope.selected.children.persons || [];
      TasksForContact(
        $scope.selected.doc._id,
        $scope.selected.doc.type,
        _.pluck(children, 'id'),
        'ContactsContentCtrl',
        function(areTasksEnabled, tasks) {
          if ($scope.selected) {
            $scope.selected.areTasksEnabled = areTasksEnabled;
            $scope.selected.tasks = tasks;
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
    };

    var selectContact = function(id) {
      $scope.setLoadingContent(id);
      return ContactViewModelGenerator(id)
        .then(function(model) {
          var refreshing = ($scope.selected && $scope.selected.doc._id) === id;
          $scope.setSelected(model);
          $scope.settingSelected(refreshing);
          getTasks();
        })
        .catch(function(err) {
          if (err.error === 'not_found') {
            $translate('error.404.title').then(Snackbar);
          }
          $scope.clearSelected();
          $log.error('Error generating contact view model', err, err.message);
        });
    };

    this.setupPromise = $q.resolve().then(function() {
      if ($stateParams.id) {
        return selectContact($stateParams.id);
      }
      $scope.clearSelected();
      if ($scope.isMobile()) {
        return;
      }
      return getHomePlaceId().then(function(id) {
        if (id) {
          return selectContact(id);
        }
      });
    });

    var changeListener = Changes({
      key: 'contacts-content',
      filter: function(change) {
        return $scope.selected && $scope.selected.doc._id === change.id;
      },
      callback: function(change) {
        if (change.deleted) {
          var parentId = $scope.selected &&
                         $scope.selected.doc &&
                         $scope.selected.doc.parent &&
                         $scope.selected.doc.parent._id;
          if (parentId) {
            // select the parent
            selectContact(parentId);
          } else {
            // top level contact deleted - clear selection
            $scope.clearSelected();
          }
        } else {
          // refresh the updated contact
          selectContact(change.id);
        }
      }
    });

    $scope.$on('$destroy', changeListener.unsubscribe);

  }
);
