var messageUtils = require('message-utils'),
    lineageFactory = require('lineage');

angular.module('services').factory('MessageQueue',
  function(
    $q,
    $translate,
    DB,
    Settings
  ) {

    'use strict';
    'ngInject';

    var lineage = lineageFactory($q,DB({ remote: true }));
    var settings;

    var findSummaryByPhone = function(summaries, phone) {
      var summary = summaries.rows.find(function(summary) {
        return summary.value.phone === phone;
      });

      return summary && summary.value;
    };

    var findPatientUUidByPatientId = function(contactsByReference, patientId) {
      var patient = contactsByReference.rows.find(function(row) {
        return row.key[1] === patientId;
      });

      return patient && patient.id;
    };

    var findRegistrationsByPatientId = function(registrations, patientId) {
      return registrations.rows
        .filter(function(row) {
          return row.key === patientId && row.doc;
        })
        .map(function(row) {
          return row.doc;
        });
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

    var getUniquePatientIds = function(messages) {
      return messages
        .map(function(message) {
          // don't process items which already have generated messages
          return !message.message && message.record.patient_id;
        })
        .filter(function(patientId, idx, self) {
          return patientId && self.indexOf(patientId) === idx;
        });
    };

    var getPatientsAndRegistrations = function(messages) {
      var patientIds = getUniquePatientIds(messages);

      if (!patientIds.length) {
        return Promise.resolve(messages);
      }

      var referenceKeys = patientIds.map(function(patientId) {
        return [ 'shortcode', patientId ];
      });

      return $q
        .all([
          DB({ remote: true }).query('medic-client/contacts_by_reference', { keys: referenceKeys }),
          DB({ remote: true }).query('medic-client/registered_patients', { keys: patientIds, include_docs: true })
        ])
        .then(function(results) {
          messages.forEach(function(message) {
            message.context = {
              patient_uuid: findPatientUUidByPatientId(results[0], message.record.patient_id) ||
                            message.record.patient_uuid,
              registrations: findRegistrationsByPatientId(results[1], message.record.patient_id)
            };
          });

          return messages;
        });
    };

    var hydrateContacts = function(messages) {
      var contactIds = [];
      messages.forEach(function(message) {
        if (!message.message) {
          contactIds.push(message.context.patient_uuid, message.record.contact && message.record.contact._id);
        }
      });

      if (!contactIds.length) {
        return Promise.resolve(messages);
      }

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
            message.context.patient = findContactById(hydratedDocs, message.context.patient_uuid);
            message.contact = findContactById(hydratedDocs, message.record.contact && message.record.contact._id);
          });

          return messages;
        });
    };

    var generateScheduledMessages = function(messages) {
      var translate = function(key, locale) {
        return $translate.instant(key, null, 'no-interpolation', locale, null);
      };

      messages.forEach(function(message) {
        if (message.message) {
          return;
        }

        var content = {
          translationKey: message.scheduled_message.message_key,
          message: message.scheduled_message.message
        };

        message.message = messageUtils.generate(
          settings,
          translate,
          message,
          content,
          message.scheduled_message.recipient,
          message.context
        )[0];
      });

      return messages;
    };

    var getTaskDisplayName = function(task) {
      if (task.translation_key) {
        return $translate.instant(task.translation_key, { group: task.group });
      }

      return task.type && task.type + (task.group ? ':' + task.group : '' ) || false;
    };

    var formatMessages = function(messages) {
       return messages.map(function(message) {
         return {
           record: {
             id: message.record.id,
             reported_date: message.record.reported_date
           },
           recipient: message.recipient && message.recipient.name || message.message.to,
           task: getTaskDisplayName(message.task),
           state: message.task.state,
           state_history: message.task.state_history,
           content: message.message.message,
           due: message.due
         };
       });
    };

    var getOptions = function(tab, skip, limit) {
      limit = limit || 10;
      var options = {
        limit: limit,
        skip: skip || 0,
        reduce: false
      };
      var paging = {
        reduce: true,
        group_level: 1
      };

      switch (tab) {
        case 'scheduled':
          options.start_key = paging.start_key = [tab, 0];
          options.end_key = paging.end_key = [tab, {}];
          break;
        case 'due':
          options.start_key = paging.start_key = [tab, {}];
          options.end_key = paging.end_key = [tab, 0];
          options.descending = paging.descending = true;
          break;
        case 'muted':
          options.start_key = paging.start_key = [tab, new Date().getTimestamp()];
          options.end_key = paging.end_key = [tab, {}];
          break;
      }

      return { query: options, paging: paging  };
    };

    return function(tab, skip, limit) {
      var options = getOptions(tab, skip, limit);
      return $q
        .all([
          Settings(),
          DB({ remote: true }).query('medic-admin/message_queue', options.query),
          DB({ remote: true }).query('medic-admin/message_queue', options.paging)
        ])
        .then(function(results) {
          settings = results[0];

          var list = results[1].rows.map(function(row) {
            return row.value;
          });

          return getPatientsAndRegistrations(list)
            .then(hydrateContacts)
            .then(generateScheduledMessages)
            .then(getRecipients)
            .then(function(list) {
              return {
                rows: formatMessages(list),
                total: results[2].rows[0].value
              };
            });

        });
    };
  }
);
