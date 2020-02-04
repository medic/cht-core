const _ = require('lodash');

angular.module('inboxServices').factory('HydrateMessages',
  function(
    $q,
    LineageModelGenerator
  ) {

    'use strict';
    'ngInject';

    const buildMessageModel = function(doc, key, date, report) {
      let contact = null; let phone = null; let message = null; let
        outgoing = false;
      if(doc.kujua_message) {
        outgoing = true;
        const task = _.find(doc.tasks, function(task) {
          const msg = task.messages[0];
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

      let type = 'unknown'; let
        from = doc._id;
      if(contact) {
        type = 'contact';
        from = contact._id;
      } else if(phone){
        type = 'phone';
        from = phone;
      }

      const lineage = report && _.map(report.lineage, 'name');
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
      const rowsObject = {}; const
        contactIds = [];
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
