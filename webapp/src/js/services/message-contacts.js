var _ = require('underscore');

angular.module('inboxServices').factory('MessageContacts',
  function(
    AddReadStatus,
    DB,
    GetDataRecords,
    HydrateMessages
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
          //include_docs on reduce views (listParams)
          if(params.reduce === undefined || params.reduce === true) {
            var valueId = function(value) { return value.id; };
            var ids = _.map(_.pluck(response.rows, 'value'), valueId);
            return GetDataRecords(ids, {include_docs: true}).then(function(docs) {
              _.each(response.rows, function(row, idx) { row.doc = docs[idx]; });
              return response.rows;
            });
          } else {
            return response.rows;
          }
        })
        .then(HydrateMessages);
    };

    return {
      list: function() {
        return getMessages(listParams())
          .then(AddReadStatus.messages);
      },
      conversation: function(id, skip) {
        return getMessages(conversationParams(id, skip || 0))
          .then(AddReadStatus.messages);
      }
    };
  }
);
