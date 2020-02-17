const _ = require('lodash/core');

angular.module('inboxServices').factory('MessageListUtils',
  function(
  ) {
    'use strict';
    'ngInject';

    const removeDeleted = (allMessages, changedMessages) => {
      for (let i = allMessages.length - 1; i >= 0; i--) {
        if (!changedMessages.some(changed => allMessages[i].key === changed.key)) {
          allMessages.splice(i, 1);
        }
      }
    };

    const mergeUpdated = (allMessages, changedMessages) => {
      changedMessages.forEach(updated => {
        const match = _.find(allMessages, existing => existing.key === updated.key);
        if (match) {
          if (!_.isEqual(updated.message, match.message)) {
            match.message = updated.message;
            match.read = false;
          }
        } else {
          allMessages.push(updated);
        }
      });
    };

    return {
      removeDeleted: removeDeleted,
      mergeUpdated: mergeUpdated
    };
  }
);
