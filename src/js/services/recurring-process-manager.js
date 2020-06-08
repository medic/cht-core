angular.module('inboxServices').factory('RecurringProcessManager',
  function(
    $interval,
    RelativeDate,
    UnreadRecords
  ) {
    'use strict';
    'ngInject';

    const recurringProcesses = {
      updateRelativeDates: false,
      updateReadDocsCount: false
    };

    const stopRecurringProcess = (processName) => {
      if (recurringProcesses[processName]) {
        $interval.cancel(recurringProcesses[processName]);
        recurringProcesses[processName] = false;
      }
    };

    return {
      startUpdateRelativeDate: function() {
        if (recurringProcesses.updateRelativeDates) {
          return;
        }

        recurringProcesses.updateRelativeDates = $interval(
          RelativeDate.updateRelativeDates,
          RelativeDate.getUpdateTimeDelta || 10 * 60 * 1000,
          0,
          false //don't digest
        );
      },
      stopUpdateRelativeDate: () => stopRecurringProcess('updateRelativeDates'),
      startUpdateReadDocsCount: () => {
        if (recurringProcesses.updateReadDocsCount) {
          return;
        }

        recurringProcesses.updateReadDocsCount = $interval(
          UnreadRecords.count,
          UnreadRecords.getUpdateTimeDelta || 5 * 60 * 1000, // 5 minutes
          0,
          true //do digest
        );
      },
      stopUpdateReadDocsCount: () => stopRecurringProcess('updateReadDocsCount')
    };
  }
);
