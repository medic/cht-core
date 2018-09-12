var messageUtils = require('message-utils'),
    lineageFactory = require('lineage'),
    registrationUtils = require('registration-utils');

angular.module('services').factory('MessageQueueUtils',
  function(
    $q,
    DB
  ) {

    'use strict';
    'ngInject';

    return {
      messages: messageUtils,
      lineage: lineageFactory($q,DB({ remote: true })),
      registrations: registrationUtils
    };
  });

angular.module('services').factory('MessageQueue',
  function(
    $log,
    $q,
    $translate,
    DB,
    Languages,
    MessageQueueUtils,
    Settings
  ) {

    'use strict';
    'ngInject';

    var findSummaryByPhone = function(summaries, phone) {
      var summary = summaries.rows.find(function(summary) {
        return summary.value.phone === phone;
      });

      return summary && summary.value;
    };

    var findPatientUUidByPatientId = function(contactsByReference, patientId) {
      var patient = contactsByReference.find(function(row) {
        return row.key[1] === patientId;
      });

      return patient && patient.id;
    };

    var findRegistrationsByPatientId = function(registrations, patientId) {
      return registrations
        .filter(function(row) {
          return row.key === patientId;
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

    var compactUnique = function(array) {
      return array.filter(function(item, idx, self) {
        return item && self.indexOf(item) === idx;
      });
    };

    var getRecipients = function(messages) {
      var phoneNumbers = compactUnique(messages.map(function(row) {
        return row.sms && row.sms.to;
      }));

      if (!phoneNumbers.length) {
        return messages;
      }

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
            message.recipient = message.sms &&
                                message.sms.to &&
                                findSummaryByPhone(summaries, message.sms.to);
          });

          return messages;
        });
    };

    var getUniquePatientIds = function(messages) {
      return compactUnique(messages.map(function(message) {
        // don't process items which already have generated messages
        return !message.sms && message.record && message.record.patient_id;
      }));
    };

    var getPatientsAndRegistrations = function(messages, settings) {
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
          var contactsByReference = results[0].rows;
          var registrations = results[1].rows.filter(function(row) {
            return MessageQueueUtils.registrations.isValidRegistration(row.doc, settings);
          });
          messages.forEach(function(message) {
            message.context = {
              patient_uuid: findPatientUUidByPatientId(contactsByReference, message.record.patient_id) ||
                            message.record.patient_uuid,
              registrations: findRegistrationsByPatientId(registrations, message.record.patient_id)
            };
          });

          return messages;
        });
    };

    var hydrateContacts = function(messages) {
      var contactIds = [];
      messages.forEach(function(message) {
        if (!message.sms) {
          contactIds.push(message.context.patient_uuid, message.record.contact && message.record.contact._id);
        }
      });
      contactIds = compactUnique(contactIds);
      if (!contactIds.length) {
        return messages;
      }

      return MessageQueueUtils.lineage
        .fetchLineageByIds(contactIds)
        .then(function(docList) {
          return docList.map(function(docs) {
            var doc = docs.shift();
            return {
              id: doc._id,
              doc: MessageQueueUtils.lineage.fillParentsInDocs(doc, docs)
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

    var generateScheduledMessages = function(messages, settings) {
      var translate = function(key, locale) {
        return $translate.instant(key, null, 'no-interpolation', locale, null);
      };

      messages.forEach(function(message) {
        if (message.sms) {
          return;
        }

        var content = {
          translationKey: message.scheduled_sms.translation_key,
          message: message.scheduled_sms.content
        };
        var pseudoDoc = {
          _id: message.record.id,
          contact: message.contact,
          fields: message.record.fields,
          locale: message.record.locale
        };

        message.sms = MessageQueueUtils.messages.generate(
          settings,
          translate,
          pseudoDoc,
          content,
          message.scheduled_sms.recipient,
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
            reportedDate: message.record.reported_date
          },
          recipient: message.recipient && message.recipient.name || message.sms.to,
          task: getTaskDisplayName(message.task),
          state: message.task.state,
          stateHistory: message.task.state_history,
          content: message.sms.message,
          due: message.due,
          link: !!message.record.form
        };
      });
    };

    var getParams = function(tab, skip, limit, descending) {
      var list = {
        limit: limit || 25,
        skip: skip || 0,
        reduce: false
      };

      var count = {
        reduce: true,
        group_level: 1
      };

      var paging;
      switch (tab) {
        case 'scheduled':
          paging = {
            start_key: [tab, 0],
            end_key: [tab, {}]
          };
          break;
        case 'due':
          paging = {
            start_key: [tab, {}],
            end_key: [tab, 0],
            descending: true
          };
          break;
        case 'muted':
          if (descending) {
            // get all past muted messages, descending from most recent
            paging = {
              start_key: [ tab, new Date().getTime() ],
              end_key: [ tab, 0 ],
              descending: true
            };
          } else {
            paging = {
              // get all future muted messages
              start_key: [ tab, new Date().getTime() ],
              end_key: [ tab, {} ]
            };
          }
          break;
      }

      return {
        list: Object.assign(list, paging),
        count: Object.assign(count, paging)
      };
    };

    return {
      loadTranslations: function() {
        return Languages()
          .then(function(languages) {
            return languages && $q.all(languages.map(function(language) {
              return language &&
                     language.code &&
                     language.code !== 'en' &&
                     $translate('admin.message.queue', {}, undefined, undefined, language.code);
            }));
          })
          .catch(function(err) {
            $log.error('Error fetching languages', err);
            throw(err);
          });
      },

      query: function(tab, skip, limit, descending) {
        var params = getParams(tab, skip, limit, descending);
        return $q
          .all([
            Settings(),
            DB({ remote: true }).query('medic-admin/message_queue', params.list),
            DB({ remote: true }).query('medic-admin/message_queue', params.count)
          ])
          .then(function(results) {
            var settings = results[0];
            var messages = results[1].rows.map(function(row) {
              return row.value;
            });

            return getPatientsAndRegistrations(messages, settings)
              .then(hydrateContacts)
              .then(function(messages) {
                return generateScheduledMessages(messages, settings);
              })
              .then(getRecipients)
              .then(function(messages) {
                return {
                  messages: formatMessages(messages),
                  total: results[2].rows[0].value
                };
              });

          });
      }
    };
  }
);
