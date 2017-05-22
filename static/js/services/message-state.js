var _ = require('underscore'),
    utils = require('medic-api-utils');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');
  
  inboxServices.factory('MessageState', ['DB',
    function(DB) {
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
              var changed = false;
              _.each(doc.scheduled_tasks, function(task) {
                if (task.group === group && task.state === fromState) {
                  changed = true;
                  utils.setTaskState(task, toState);
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
  ]);
  
}());
