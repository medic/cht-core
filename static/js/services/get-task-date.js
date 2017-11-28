/*
  Is responsible for returning a Task's date.
 */
angular.module('inboxServices').factory('GetTaskDate',
  function() {
    'use strict';
    return function(task) {
      var current = task.state_history &&
                    task.state_history.length &&
                    task.state_history[task.state_history.length - 1];
      if (current) {
        if (current.state === 'scheduled') {
          return task.due;
        }
        return current.timestamp;
      }
      return task.due || task.reported_date;
    };
  }
);
