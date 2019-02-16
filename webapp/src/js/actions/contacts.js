angular.module('inboxServices').factory('ContactsActions',
  function() {
    'use strict';

    function createSingleValueAction(type, valueName, value) {
      var action = {
        type: type,
        payload: {}
      };
      action.payload[valueName] = value;
      return action;
    }

    return function(dispatch) {

      function createSetSelectedContactAction(value) {
        return createSingleValueAction('SET_SELECTED_CONTACT', 'selected', value);
      }

      function createSetSelectedContactPropertyAction(value) {
        return createSingleValueAction('SET_SELECTED_CONTACT_PROPERTY', 'selected', value);
      }

      return {
        setSelectedContact: function(selected) {
          dispatch(createSetSelectedContactAction(selected));
        },

        clearSelectedContact: function() {
          dispatch(createSetSelectedContactAction(null));
        },

        setSelectedContactAreTasksEnabled: function(enabled) {
          dispatch(createSetSelectedContactPropertyAction({ areTasksEnabled: enabled }));
        },

        setSelectedContactTasks: function(tasks) {
          dispatch(createSetSelectedContactPropertyAction({ tasks: tasks }));
        },

        setSelectedContactSummary: function(summary) {
          dispatch(createSetSelectedContactPropertyAction({ summary: summary }));
        },

        setSelectedContactError: function(error) {
          dispatch(createSetSelectedContactPropertyAction({ error: error }));
        }
      };
    };
  }
);
