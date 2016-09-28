/* jshint node: true */
'use strict';

var _ = require('underscore');
var inboxServices = angular.module('inboxServices');

/**
 * Get the tasks, in order, for a given contact.
 * Pass in a listener to get a refreshed list after db changes.
 */
inboxServices.factory('TasksForContact',
  function(
    $log,
    RulesEngine) {
    'ngInject';

    var mergeTasks = function(existingTasks, newTasks) {
      $log.debug('Updating contact tasks', existingTasks, newTasks);
      if (existingTasks) {
        newTasks.forEach(function(task) {
          for (var i = 0; i < existingTasks.length; i++) {
            if (existingTasks[i]._id === task._id) {
              existingTasks[i] = task;
              return;
            }
          }
          existingTasks.push(task);
        });
      }
    };

    var sortTasks = function(tasks) {
      tasks.sort(function(a, b) {
        var dateA = new Date(a.date).getTime();
        var dateB = new Date(b.date).getTime();
        return dateA - dateB;
      });
    };

    var getTasks = function(docId, docType, childrenPersonIds, listenerName, listener) {
      var taskList = [];
      if (docType !== 'clinic' &&
          docType !== 'person') {
        return listener([]);
      }
      var patientIds = [docId];
      if (docType === 'clinic' && childrenPersonIds && childrenPersonIds.length) {
        patientIds = patientIds.concat(childrenPersonIds);
      }
      RulesEngine.listen(listenerName, 'task', function(err, tasks) {
        if (err) {
          return $log.error('Error getting tasks', err);
        }
        var newTasks = _.filter(tasks, function(task) {
          return !task.resolved && task.contact && _.contains(patientIds, task.contact._id);
        });
        mergeTasks(taskList, newTasks);
        sortTasks(taskList);
        listener(taskList);
      });
    };

    return getTasks;

  });