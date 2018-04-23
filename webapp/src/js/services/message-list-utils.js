var _ = require('underscore');

angular.module('inboxServices').factory('MessageListUtils',
  function(
  ) {
    'use strict';
    'ngInject';

    var removeDeleted = function(allMessages, changedMessages) {
      var existingKey;
      var checkExisting = function(updated) {
        return existingKey === updated.key;
      };
      for (var i = allMessages.length - 1; i >= 0; i--) {
        existingKey = allMessages[i].key;
        if (!_.some(changedMessages, checkExisting)) {
          allMessages.splice(i, 1);
        }
      }
    };

    var mergeUpdated = function(allMessages, changedMessages, selectedId) {
      var selectedChanged = false;
      _.each(changedMessages, function(updated) {
        var match = _.find(allMessages, function(existing) {
          return existing.key === updated.key;
        });
        if (match) {
          if (!_.isEqual(updated.message, match.message)) {
            match.message = updated.message;
            match.read = false;
          }
        } else {
          allMessages.push(updated);
        }
        if (selectedId === updated.key) {
          selectedChanged = true;
        }
      });
      return selectedChanged;
    };

    return {
      removeDeleted: removeDeleted,
      mergeUpdated: mergeUpdated
    };
  }
);
