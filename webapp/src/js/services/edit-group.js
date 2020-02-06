const _ = require('lodash/core');

(function() {
  'use strict';

  const getTo = function(dataRecord, group) {
    let to;
    if (
      group.rows &&
      group.rows.length &&
      group.rows[0].messages &&
      group.rows[0].messages.length
    ) {
      to = group.rows[0].messages[0].to;
    }
    return to || dataRecord.from;
  };

  const add = function(dataRecord, group) {
    let changed = false;
    const to = getTo(dataRecord, group);
    _.forEach(group.rows, function(updatedTask) {
      if (updatedTask.added) {
        changed = true;
        dataRecord.scheduled_tasks.push({
          messages: [{ to: to }],
          state: 'scheduled',
          group: group.number,
          type: group.type,
        });
      }
    });
    return changed;
  };

  const update = function(dataRecord, group) {
    let changed = false;
    const tasks = _.filter(dataRecord.scheduled_tasks, {
      group: group.number,
    });
    _.forEach(group.rows, function(updatedTask, i) {
      if (updatedTask.state === 'scheduled') {
        changed = true;
        tasks[i].due = updatedTask.due;
        if (!updatedTask.translation_key) {
          _.forEach(updatedTask.messages, function(updatedMessage, j) {
            tasks[i].messages[j].message = updatedMessage.message;
          });
        }
      }
    });
    return changed;
  };

  const remove = function(dataRecord, group) {
    let changed = false;
    let groupIndex = group.rows.length - 1;
    for (let i = dataRecord.scheduled_tasks.length - 1; i >= 0; i--) {
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

  angular.module('inboxServices').factory('EditGroup',
    function(DB) {
      'ngInject';
      return function(recordId, group) {
        return DB()
          .get(recordId)
          .then(function(dataRecord) {
            const additions = add(dataRecord, group);
            const mutations = update(dataRecord, group);
            const deletions = remove(dataRecord, group);
            if (additions || mutations || deletions) {
              return DB()
                .put(dataRecord)
                .then(function() {
                  return dataRecord;
                });
            } else {
              return dataRecord;
            }
          });
      };
    }
  );
})();
