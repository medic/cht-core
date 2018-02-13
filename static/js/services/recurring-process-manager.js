angular.module('inboxServices').factory('RecurringProcessManager',
  function(
    $interval,
    RelativeDate
  ) {
    'use strict';
    'ngInject';

    var recurringProcesses = {
      updateRelativeDates: {
        interval: false,
        timeDelta: 10 * 60 * 1000,
        callback: RelativeDate.updateRelativeDates
      }
    };

    return {
      startUpdateRelativeDate: function() {
        if (recurringProcesses.updateRelativeDates.interval) {
          $interval.cancel(recurringProcesses.updateRelativeDates.interval);
        }

        recurringProcesses.updateRelativeDates.interval = $interval(
          recurringProcesses.updateRelativeDates.callback,
          recurringProcesses.updateRelativeDates.timeDelta,
          false //don't digest
        );
      },
      stopUpdateRelativeDate: function() {
        if (recurringProcesses.updateRelativeDates.interval) {
          $interval.cancel(recurringProcesses.updateRelativeDates.interval);
        }
      }
    };
  }
);
