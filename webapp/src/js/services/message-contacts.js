angular.module('inboxServices').factory('MessageContacts',
  function(
    AddReadStatus,
    DB,
    GetDataRecords,
    HydrateMessages
  ) {
    'use strict';
    'ngInject';

    const listParams = () => ({
      group_level: 1
    });

    const defaultLimit = 50;

    const conversationParams = (id, skip, limit = 0) => ({
      reduce: false,
      descending: true,
      include_docs: true,
      skip: skip,
      limit: Math.max(limit, defaultLimit),
      startkey: [ id, {} ],
      endkey: [ id ],
    });

    const getMessages = (params) => {
      return DB()
        .query('medic-client/messages_by_contact_date', params)
        .then(response => {
          if (!response.rows) {
            return [];
          }

          if(params.reduce !== undefined && params.reduce !== true) {
            return response.rows;
          }

          //include_docs on reduce views (listParams)
          const ids = response.rows.map(row => row.value && row.value.id);
          return GetDataRecords(ids, { include_docs: true }).then(docs => {
            response.rows.forEach((row, idx) => row.doc = docs[idx]);
            return response.rows;
          });
        })
        .then(HydrateMessages);
    };

    return {
      list: () => {
        return getMessages(listParams())
          .then(AddReadStatus.messages);
      },
      conversation: (id, skip = 0, limit = 0) => {
        return getMessages(conversationParams(id, skip, limit))
          .then(AddReadStatus.messages);
      },

      isRelevantChange: (change, conversation) => (
        (change.doc && change.doc.kujua_message) ||
        (change.doc && change.doc.sms_message) ||
        change.deleted ||
        (conversation && conversation.messages && conversation.messages.find(message => message.doc._id === change.id))
      ),

      defaultLimit,
    };
  }
);
