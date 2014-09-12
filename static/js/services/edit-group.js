var _ = require('underscore');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');
  
  inboxServices.factory('EditGroup', ['db', 'audit',
    function(db, audit) {
      return function(recordId, group, callback) {
        db.getDoc(recordId, function(err, dataRecord) {
          if (err) {
            return callback(err);
          }
          var changed = false;
          var tasks = _.where(dataRecord.scheduled_tasks, {
            group: group.rows[0].group
          });
          _.each(group.rows, function(updatedTask, i) {
            if (updatedTask.state === 'scheduled') {
              changed = true;
              tasks[i].due = updatedTask.due;
              _.each(updatedTask.messages, function(updatedMessage, j) {
                tasks[i].messages[j].message = updatedMessage.message;
              });
            }
          });
          if (!changed) {
            return callback(null, dataRecord);
          }
          audit.saveDoc(dataRecord, function(err) {
            callback(err, dataRecord);
          });
        });
      };
    }
  ]);
  
}());