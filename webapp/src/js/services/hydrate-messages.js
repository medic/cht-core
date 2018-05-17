var _ = require('underscore');

angular.module('inboxServices').factory('HydrateMessages',
  function(
    $q,
    DB,
    LineageModelGenerator
  ) {

    'use strict';
    'ngInject';

    var hydrateMessage = function(doc, contactId, reportedDate) {
      var contact = null, phone = null, message = null;
      if(doc.kujua_message) {
        var task = _.find(doc.tasks, function(task) {
          return task.messages[0] && task.messages[0].contact._id === contactId;
        });
        if(task && task.messages) {
          message = task.messages[0].message;
          contact = task.messages[0].contact;
          phone = task.messages[0].to;
        }
      } else if (doc.sms_message) {
        message = doc.sms_message.message;
        contact = doc.contact;
        phone = doc.from;
      }

      return LineageModelGenerator.reportSubject(contactId).then(function(report) {
        var lineageNames = _.pluck(report.lineage, 'name');
        return {
          doc: doc,
          id: doc._id,
          key: contactId,
          contact: report.doc.name,
          lineage: lineageNames,
          outgoing: doc.kujua_message ? true : false,
          from: (contact && contact._id) || phone || doc._id,
          date: reportedDate,
          type: contact ? 'contact' : phone ? 'phone' : 'unknown',
          message: message
        };
      });
    };

    return function(rows) {
      var promises = [];
      rows.forEach(function(row) {
        promises.push(hydrateMessage(row.doc, row.key[0], row.value.date));
      });
      return $q.all(promises);
    };
  }
);
