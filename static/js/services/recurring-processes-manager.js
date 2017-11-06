var UPDATE_RELATIVE_TIME = require('../modules/constants').UPDATE_RELATIVE_TIME;

/*
  Is responsible for managing and storing recurring processes.
  Provides an interface for turning on a recurring process of predefined
  type and turning it off when needed.
 */
angular.module('inboxServices').factory('RecurringProcessesManager',
  function($interval, DomMutators) {
    'use strict';
    'ngInject';

    var recurringProcesses = {};

    function getProcessOptionsByName(name) {
      switch (name) {
        case UPDATE_RELATIVE_TIME:
          return {
            interval: 1000 * 60,
            callback: DomMutators.updateRelativeTime
          };
        default:
          throw new Error('Unknown recurring process name');
      }
    }

    function startProcessByName(name, options) {
      if (!(name in recurringProcesses)) {
        var passedOptions = options || {};
        var processOptions = Object.assign(
          getProcessOptionsByName(name),
          passedOptions
        );

        recurringProcesses[name] = $interval(
          processOptions.callback,
          processOptions.interval
        );
      }
    }

    function stopProcessByName(name) {
      if (name in recurringProcesses) {
        $interval.cancel(recurringProcesses[name]);
        delete recurringProcesses[name];
      }
    }

    return {
      startProcessByName: startProcessByName,
      stopProcessByName: stopProcessByName,
    };
  }
);
