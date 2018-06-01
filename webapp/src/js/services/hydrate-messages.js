var _ = require('underscore');

angular.module('inboxServices').factory('HydrateMessages',
  function(
    $q,
    DB,
    LineageModelGenerator
  ) {

    'use strict';
    'ngInject';

    var buildMessageModel = function(doc, key, date, report) {
      var contact = null, phone = null, message = null, outgoing = false;
      if(doc.kujua_message) {
        outgoing = true;
        var task = _.find(doc.tasks, function(task) {
          var msg = task.messages[0];
          if(msg.contact) {
            return msg.contact._id === key;
          }
          return msg.to === key;
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

      var type = 'unknown', from = doc._id;
      if(contact) {
        type = 'contact';
        from = contact._id;
      } else if(phone){
        type = 'phone';
        from = phone;
      }

      var lineage = report && _.map(_.pluck(report.lineage, 'name'));
      return {
        doc: doc,
        id: doc._id,
        key: key,
        contact: report && report.doc.name,
        lineage: lineage || [],
        outgoing: outgoing,
        from: from,
        date: date,
        type: type,
        message: message
      };
    };

    return function(rows) {
      if(!rows || rows.length <= 0) {
        return $q.resolve([]);
      }
      var rowsObject = {}, contactIds = [];
      rows.forEach(function(row) {
        rowsObject[row.key[0]] = row;
        if(row.value.contact) {
          contactIds.push(row.value.contact);
        }
      });

      return LineageModelGenerator.reportSubjects(contactIds)
        .then(function(reports) {
          reports.forEach(function(report) {
            if(rowsObject[report._id]){
              rowsObject[report._id].report = report;
            }
          });
          return rows.map(function(row){
            return buildMessageModel(row.doc, row.key[0],
                         row.value.date, row.report);
          });
      });
    };
  }
);
