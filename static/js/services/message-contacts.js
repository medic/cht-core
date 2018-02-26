var _ = require('underscore');

angular.module('inboxServices').factory('MessageContacts',
  function(
    AddReadStatus,
    DB,
    GetContactSummaries
  ) {
    'use strict';
    'ngInject';

    var listParams = function() {
      return {
        group_level: 1
      };
    };

    var conversationParams = function(id, skip) {
      return {
        reduce: false,
        descending: true,
        include_docs: true,
        skip: skip,
        limit: 50,
        startkey: [ id, {} ],
        endkey: [ id ]
      };
    };

    var getMessages = function(params) {
      return DB().query('medic-client/messages_by_contact_date', params)
        .then(function(response) {
          return response.rows;
        });
    };

    var getSummaries = function(result) {
      result = _.pluck(result, 'value');
      // populate the summaries of the result values then return the result
      return GetContactSummaries(result);
    };

    return {
      list: function() {
        return getMessages(listParams())
          .then(getSummaries)
          .then(AddReadStatus.messages);
      },
      conversation: function(id, skip) {
        return getMessages(conversationParams(id, skip || 0))
          .then(AddReadStatus.messages);
      }
    };
  }
);
