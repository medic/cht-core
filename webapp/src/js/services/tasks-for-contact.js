var _ = require('underscore'),
    moment = require('moment');

/**
 * Get the tasks, in order, for a given contact.
 * Pass in a listener to get a refreshed list after db changes.
 */
angular.module('inboxServices').factory('TasksForContact',
  function(
    $log,
    $translate,
    RulesEngine,
    TranslateFrom
  ) {
    'use strict';
    'ngInject';

    var mergeTasks = function(existingTasks, newTasks) {
      $log.debug('Updating contact tasks', existingTasks, newTasks);
      if (existingTasks) {
        newTasks.forEach(function(task) {
          var toRemove = task.resolved || task.deleted;
          for (var i = 0; i < existingTasks.length; i++) {
            if (existingTasks[i]._id === task._id) {
              if (toRemove) {
                existingTasks.splice(i, 1);
              } else {
                existingTasks[i] = task;
              }
              return;
            }
          }
          if (!toRemove) {
            existingTasks.push(task);
          }
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

    var addLateStatus = function(tasks) {
      tasks.forEach(function(task) {
        var momentDate = moment(task.date);
        var now = moment().startOf('day');
        task.isLate = momentDate.isBefore(now);
      });
    };

    const translate = (value, task) => {
      if (_.isString(value)) {
        // new translation key style
        return $translate.instant(value, task);
      }
      // old message array style
      return TranslateFrom(value, task);
    };

    const translateLabels = tasks => {
      tasks.forEach(function(task) {
        task.title = translate(task.title, task);
        task.priorityLabel = translate(task.priorityLabel, task);
      });
    };

    var areTasksEnabled = function(docType) {
      return RulesEngine.enabled && (docType === 'clinic' || docType === 'person');
    };

    const getIdsForTasks = (model) => {
      let contactIds = [];
      if (model.doc.type === 'clinic' && model.children && model.children.persons && model.children.persons.length) {
        contactIds = model.children.persons.map(child => child.id);
      }
      contactIds.push(model.doc._id);
      return contactIds;
    };

    var getTasks = function(contactIds, listenerName, listener) {
      var taskList = [];
      RulesEngine.listen(listenerName, 'task', function(err, tasks) {
        if (err) {
          return $log.error('Error getting tasks', err);
        }
        var newTasks = _.filter(tasks, function(task) {
          return task.contact && _.contains(contactIds, task.contact._id);
        });
        addLateStatus(newTasks);
        translateLabels(newTasks);
        mergeTasks(taskList, newTasks);
        sortTasks(taskList);
        listener(taskList);
      });
    };

    /** Listener format : function(newTasks) */
    return (model, listenerName, listener) => {
      if (!areTasksEnabled(model.doc.type)) {
        return listener(false);
      }

      const contactIds = getIdsForTasks(model);
      getTasks(contactIds, listenerName, listener);
    };
  }
);
