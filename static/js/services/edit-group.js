var _ = require('underscore');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  var getTo = function(dataRecord, group) {
    var to;
    if (group.rows &&
        group.rows.length &&
        group.rows[0].messages &&
        group.rows[0].messages.length) {
      to = group.rows[0].messages[0].to;
    }
    return to || dataRecord.from;
  };

  var add = function(dataRecord, group) {
    var changed = false;
    var to = getTo(dataRecord, group);
    _.each(group.rows, function(updatedTask) {
      if (updatedTask.added) {
        changed = true;
        dataRecord.scheduled_tasks.push({
          messages: [{ to: to }],
          state: 'scheduled',
          group: group.number,
          type: group.type
        });
      }
    });
    return changed;
  };

  var update = function(dataRecord, group) {
    var changed = false;
    var tasks = _.where(dataRecord.scheduled_tasks, {
      group: group.number
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

  var remove = function(dataRecord, group) {
    var changed = false;
    var groupIndex = group.rows.length - 1;
    for (var i = dataRecord.scheduled_tasks.length - 1; i >= 0; i--) {
      if (dataRecord.scheduled_tasks[i].group === group.number) {
        if (group.rows[groupIndex].deleted) {
          changed = true;
          dataRecord.scheduled_tasks.splice(i, 1);
        }
        groupIndex--;
      }
    }
    return changed;
  };

  inboxServices.factory('EditGroup', ['DB',
    function(DB) {
      return function(recordId, group) {
        return new Promise(function(resolve, reject) {
          DB.get()
            .get(recordId)
            .then(function(dataRecord) {
              var additions = add(dataRecord, group);
              var mutations = update(dataRecord, group);
              var deletions = remove(dataRecord, group);
              if (additions || mutations || deletions) {
                DB.get()
                  .put(dataRecord)
                  .then(function() {
                    resolve(dataRecord);
                  })
                  .catch(reject);
              } else {
                resolve(dataRecord);
              }
            })
            .catch(reject);
        });
      };
    }
  ]);
  
}());