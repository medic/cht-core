var _ = require('underscore');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  var update = function(dataRecord, group) {
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
    return changed;
  };

  var removeDeleted = function(dataRecord, group) {
    var changed = false;
    var groupIndex = group.rows.length - 1;
    for (var i = dataRecord.scheduled_tasks.length - 1; i >= 0; i--) {
      if (dataRecord.scheduled_tasks[i].group === group.rows[0].group) {
        if (group.rows[groupIndex].deleted) {
          changed = true;
          dataRecord.scheduled_tasks.splice(i, 1);
        }
        groupIndex--;
      }
    }
    return changed;
  };

  inboxServices.factory('EditGroup', ['db', 'audit',
    function(db, audit) {
      return function(recordId, group, callback) {
        db.getDoc(recordId, function(err, dataRecord) {
          if (err) {
            return callback(err);
          }
          var mutations = update(dataRecord, group);
          var deletions = removeDeleted(dataRecord, group);
          if (!mutations && !deletions) {
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