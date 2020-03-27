const moment = require('moment');

/**
 * Get the tasks, in order, for a given contact.
 * Pass in a listener to get a refreshed list after db changes.
 */
angular.module('inboxServices').factory('TasksForContact',
  function(
    ContactTypes,
    RulesEngine
  ) {
    'use strict';
    'ngInject';

    const getIdsForTasks = (model) => {
      const contactIds = [];
      if (!model.type.person && model.children) {
        model.children.forEach(child => {
          if (child.type.person && child.contacts && child.contacts.length) {
            contactIds.push(...child.contacts.map(contact => contact.id));
          }
        });
      }
      contactIds.push(model.doc._id);
      return contactIds;
    };

    const areTasksEnabled = function(type) {
      return RulesEngine.isEnabled()
        .then(isRulesEngineEnabled => {
          if (!isRulesEngineEnabled) {
            return false;
          }

          // must be either a person type
          if (type.person) {
            return true;
          }

          // ... or a leaf place type
          return ContactTypes.getAll().then(types => {
            const hasChild = types.some(t => !t.person && t.parents && t.parents.includes(type.id));
            return !hasChild;
          });
        });
    };

    const decorateAndSortTasks = function(tasks) {
      tasks.forEach(function(task) {	
        const momentDate = moment(task.emission.dueDate, 'YYYY-MM-DD');	
        const now = moment().startOf('day');
        task.emission.isLate = momentDate.isBefore(now);	
      });

      tasks.sort(function(a, b) {	
        return a.emission.dueDate < b.emission.dueDate ? -1 : 1;	
      });

      return tasks;
    };

    /** Listener format : function(newTasks) */
    return (model) => {
      return areTasksEnabled(model.type)
        .then(enabled => {
          if (!enabled) {
            return [];
          }

          const contactIds = getIdsForTasks(model);
          return RulesEngine.fetchTaskDocsFor(contactIds)
            .then(tasks => decorateAndSortTasks(tasks));
        });
    };
  }
);
