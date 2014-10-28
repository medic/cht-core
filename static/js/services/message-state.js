var _ = require('underscore'),
    kujua_utils = require('kujua-utils');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');
  
  inboxServices.factory('MessageState', ['db',
    function(db) {
      return {
        any: function(group, state) {
          return _.some(group.rows, function(msg) {
            return msg.state === state;
          });
        },
        set: function(recordId, group, fromState, toState, callback) {
          db.getDoc(recordId, function(err, dataRecord) {
            if (err) {
              return callback(err);
            }
            var changed = false;
            _.each(dataRecord.scheduled_tasks, function(task) {
              if (task.group === group && task.state === fromState) {
                changed = true;
                kujua_utils.setTaskState(task, toState);
              }
            });
            if (!changed) {
              return callback(null, dataRecord);
            }
            db.saveDoc(dataRecord, function(err) {
              callback(err, dataRecord);
            });
          });
        }
      };
    }
  ]);
  
}());