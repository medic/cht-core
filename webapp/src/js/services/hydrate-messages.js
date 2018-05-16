var _ = require('underscore'),
    lineageFactory = require('lineage');

angular.module('inboxServices').factory('HydrateMessages',
  function(
    $q,
    DB
  ) {

    'use strict';
    'ngInject';

    var lineage = lineageFactory($q, DB());

    var hydrateMessage = function(docId, contactId, reportedDate) {
      return lineage.fetchHydratedDoc(docId).then(function(doc) {
        var contact = null, phone = null, message = null;
        if(doc.kujua_message) {
          for(var i = 0; i < doc.tasks.length; i++) {
            var task = doc.tasks[i];
            if(task.messages[0] && task.messages[0].contact._id === contactId) {
              message = task.messages[0];
              break;
            }
          }
          contact = message.contact;
          phone = message.to;
        } else if (doc.sms_message) {
          contact = doc.contact;
          phone = doc.from;
        }

        return lineage.fetchLineageById(contactId).then(function(lineages) {
          var lineageIds = _.pluck(lineages, '_id').slice(1);
          return {
            doc: doc,
            key: [contactId, reportedDate],
            value: {
              id: docId,
              from: (contact && contact._id) || phone || docId,
              date: reportedDate,
              message: message.message,
              contact: contact._id,
              lineage: lineageIds
            }
          };
        });
      });
    };

    return function(messages) {
      var promises = [];
      messages.forEach(function(message) {
        promises.push(hydrateMessage(message.value.id,
                        message.key[0], message.value.date));
      });
      return $q.all(promises);
    };
  }
);
