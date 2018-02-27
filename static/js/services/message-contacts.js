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

    /**
     * We want to keep CouchDB view "values" as small as possible to keep
     * CouchDB as efficient as possible. This adds some redundant information we
     * don't need to pass down.
     */
    var addDetail = function(messages) {
      messages.forEach(function(message) {
        message.value.key = message.key[0];
        message.value.id = message.id;

        if (message.value.contact) {
          message.value.type = 'contact';
        } else if (message.key[0] === message.value.from) {
          message.value.type = 'phone';
        } else {
          message.value.type = 'unknown';
        }
      });
    };

    var getMessages = function(params) {
      return DB().query('medic-client/messages_by_contact_date', params)
        .then(function(response) {
          var messages = response.rows;
          addDetail(messages);
          return messages;
        });
    };

    var getContactSummaries = function(messages) {
      messages = _.pluck(messages, 'value');
      return GetContactSummaries(messages);
    };

    return {
      list: function() {
        return getMessages(listParams())
          .then(getContactSummaries)
          .then(AddReadStatus.messages);
      },
      conversation: function(id, skip) {
        return getMessages(conversationParams(id, skip || 0))
          .then(AddReadStatus.messages);
      }
    };
  }
);
