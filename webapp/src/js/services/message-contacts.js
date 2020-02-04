const _ = require('lodash');

angular.module('inboxServices').factory('MessageContacts',
  function(
    AddReadStatus,
    DB,
    GetDataRecords,
    HydrateMessages
  ) {
    'use strict';
    'ngInject';

    const listParams = function() {
      return {
        group_level: 1
      };
    };

    const conversationParams = function(id, skip) {
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

    const getMessages = function(params) {
      return DB().query('medic-client/messages_by_contact_date', params)
        .then(function(response) {
          //include_docs on reduce views (listParams)
          if(params.reduce === undefined || params.reduce === true) {
            const valueId = function(value) { return value.id; };
            const ids = _.map(_.map(response.rows, 'value'), valueId);
            return GetDataRecords(ids, {include_docs: true}).then(function(docs) {
              _.forEach(response.rows, function(row, idx) { row.doc = docs[idx]; });
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
