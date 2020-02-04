const _ = require('lodash');
const taskUtils = require('@medic/task-utils');

(function () {

  'use strict';

  angular.module('inboxServices').factory('SetTaskState', function() {
    'ngInject';

    return function(task, state, details) {
      return taskUtils.setTaskState(task, state, details);
    };
  });

  angular.module('inboxServices').factory('MessageState',
    function(
      DB,
      SetTaskState
    ) {
      'ngInject';
      return {
        any: function(group, state) {
          return _.some(group.rows, function(msg) {
            return msg.state === state;
          });
        },
        set: function(recordId, group, fromState, toState) {
          return DB()
            .get(recordId)
            .then(function(doc) {
              let changed = false;
              _.forEach(doc.scheduled_tasks, function(task) {
                if (task.group === group && task.state === fromState) {
                  changed = true;
                  SetTaskState(task, toState);
                }
              });
              if (!changed) {
                return;
              }
              return DB().put(doc);
            });
        }
      };
    }
  );

}());
