var messageUtils = require('message-utils'),
    lineageFactory = require('lineage');

angular.module('services').factory('MessageQueue',
  function(
    $q,
    DB,
    Settings
  ) {

    'use strict';
    'ngInject';

    var lineage = lineageFactory($q,DB({ remote: true }));

    var findSummaryByPhone = function(summaries, phone) {
      var summary = summaries.rows.find(function(summary) {
        return summary.value.phone === phone;
      });

      return summary && summary.value;
    };

    var findPatientByPatientId = function(patients, patient_id) {
      var patient = patients.rows.find(function(patient) {
        return patient.value[1] === patient_id;
      });

      return patient && patient.id;
    };

    var findContactById = function(hydratedContacts, contactId) {
      var contact = hydratedContacts.find(function(hydratedContact) {
        return hydratedContact.id === contactId;
      });

      return contact && contact.doc;
    };

    var getRecipients = function(messages) {
      var phoneNumbers = messages
        .map(function(row) {
          return row.message && row.message.to;
        })
        .filter(function(item, idx, self) {
          return item && self.indexOf(item) === idx;
        });

      return DB({ remote: true })
        .query('medic-client/contacts_by_phone', { keys: phoneNumbers })
        .then(function(contactsByPhone) {
          var ids = contactsByPhone.rows.map(function(row) {
            return row.id;
          });

          return DB({ remote: true }).query('medic/doc_summaries_by_id', { keys: ids });
        })
        .then(function(summaries) {
            messages.forEach(function(message) {
              message.recipient = message.message &&
                                  message.message.to &&
                                  findSummaryByPhone(summaries, message.message.to);
            });

            return messages;
        });
    };

    var getPatients = function(messages) {
      var patientIds = messages
        .map(function(message) {
          if (message.message) {
            return;
          }

          return message.record.patient_id;
        })
        .filter(function(patient_id, idx, self) {
          return patient_id && self.indexOf(patient_id) === idx;
        });

      if (!patientIds.length) {
        return Promise.resolve(messages);
      }

      var keys = patientIds.map(function(patientId) {
        return [ 'shortcode', patientId ];
      });

      return DB({ remote: true })
        .query('medic-client/contacts_by_reference', { keys: keys })
        .then(function(contactsByReference) {
          messages.forEach(function(message) {
            message.record.patient_uuid = findPatientByPatientId(contactsByReference, message.record.patient_id) ||
                                          message.record.patient_uuid;
          });
          return messages;
        });
    };

    var hydrateContacts = function(messages) {
      var contactIds = [];
      messages.forEach(function(message) {
        contactIds.push(message.record.patient_uuid, message.record.contact && message.record.contact._id);
      });

      return lineage
        .fetchLineageByIds(contactIds)
        .then(function(docList) {
          return docList.map(function(docs) {
            var doc = docs.shift();
            return {
              id: doc._id,
              doc: lineage.fillParentsInDocs(doc, docs)
            };
          });
        })
        .then(function(hydratedDocs) {
          messages.forEach(function(message) {
            message.patient = findContactById(hydratedDocs, message.record.patient_uuid);
            message.contact = findContactById(hydratedDocs, message.record.contact && message.record.contact._id);
          });

          return messages;
        });
    };

    var generateScheduledMessages = function(messages) {
      return Settings().then(function(settings) {
        messages.forEach(function(message) {
          if (message.message) {
            return;
          }

          var translate = null;
          var content = {
            translationKey: message.task.message_key,
            message: message.task.message
          };

          message.message = messageUtils.generate(
            settings,
            translate,
            message,
            content,
            message.task.recipient);
        });

        return messages;
      });
    };

    return {
      getScheduled: function(skip, limit) {
        limit = limit || 50;

        var options = {
          limit: limit + 1,
          start_key: ['scheduled', 0],
          end_key: ['scheduled', {}],
          skip: skip || 0
        };

        var next = false;

        return DB({ remote: true })
          .query('medic-admin/message_queue', options)
          .then(function(results) {
            if (results.rows.length === options.limit) {
              // we have a next page
              results.rows.splice(-1, 1);
              next = true;
            }

            var rows = results.rows.map(function(row) {
              return row.value;
            });

            return getPatients(rows)
              .then(hydrateContacts)
              .then(generateScheduledMessages)
              .then(getRecipients)
              .then(function(rows) {
                return {
                  rows: rows,
                  next: next
                };
            });
          });
      },

      getDue: function(skip, limit) {
        limit = limit || 50;

        var options = {
          limit: limit + 1,
          start_key: ['due', {}],
          end_key: ['due', 0],
          skip: skip || 0,
          descending: true
        };

        var next = false;

        return DB({ remote: true })
          .query('medic-admin/message_queue', options)
          .then(function(results) {
            if (results.rows.length === options.limit) {
              // we have a next page
              results.rows.splice(-1, 1);
              next = true;
            }

            var rows = results.rows.map(function(row) {
              return row.value;
            });

            return getRecipients(rows).then(function(rows) {
              return {
                rows: rows,
                next: next
              };
            });
          });
      }
    };
  }
);
