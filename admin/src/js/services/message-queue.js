var lineageFactory = require('lineage'),
    messageUtils = require('message-utils'),
    registrationUtils = require('registration-utils');

angular.module('services').factory('MessageQueueUtils',
  function(
    $q,
    DB
  ) {

    'use strict';
    'ngInject';

    return {
      lineage: lineageFactory($q,DB({ remote: true })),
      messages: messageUtils,
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

    var findSummary = function(summaries, message) {
      if (!message.sms || !message.sms.to) {
        return;
      }

      var summary = summaries.rows.find(function(summary) {
        return summary.value && summary.value.phone === message.sms.to;
      });

      return summary && summary.value;
    };

    var findPatientUuid = function(contactsByReference, message) {
      var patient = contactsByReference.rows.find(function(row) {
        return row.key[1] === message.context.patient_id;
      });

      return patient && patient.id || message.context.patient_uuid;
    };

    var findRegistrations = function(registrations, message) {
      return registrations
        .filter(function(row) {
          return row.key === message.context.patient_id;
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

    var getValidRegistrations = function(registrations, settings) {
      return registrations.rows.filter(function(row) {
        return MessageQueueUtils.registrations.isValidRegistration(row.doc, settings);
      });
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
            message.recipient = findSummary(summaries, message);
          });

          return messages;
        });
    };

    var getPatientsAndRegistrations = function(messages, settings) {
      var patientIds = compactUnique(messages.map(function(message) {
        // don't process items which already have generated messages
        return !message.sms && message.context.patient_id;
      }));

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
          var contactsByReference = results[0];
          var registrations = getValidRegistrations(results[1], settings);

          messages.forEach(function(message) {
            message.context.patient_uuid = findPatientUuid(contactsByReference, message);
            message.context.registrations = findRegistrations(registrations, message);
          });

          return messages;
        });
    };

    var hydrateContacts = function(messages) {
      var contactIds = [];
      messages.forEach(function(message) {
        if (!message.sms) {
          contactIds.push(message.context.patient_uuid, message.doc.contact && message.doc.contact._id);
        }
      });
      contactIds = compactUnique(contactIds);
      if (!contactIds.length) {
        return messages;
      }

      return MessageQueueUtils.lineage
        .fetchLineageByIds(contactIds)
        .then(function(docList) {
          var hydratedDocs = docList.map(function(docs) {
            var doc = docs.shift();
            return {
              id: doc._id,
              doc: MessageQueueUtils.lineage.fillParentsInDocs(doc, docs)
            };
          });

          messages.forEach(function(message) {
            message.context.patient = findContactById(hydratedDocs, message.context.patient_uuid);
            message.doc.contact = findContactById(hydratedDocs, message.doc.contact && message.doc.contact._id);
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

        message.sms = MessageQueueUtils.messages.generate(
          settings,
          translate,
          message.doc,
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
            id: message.doc._id,
            reportedDate: message.doc.reported_date
          },
          recipient: message.recipient && message.recipient.name || message.sms.to,
          task: getTaskDisplayName(message.task),
          state: message.task.state,
          stateHistory: message.task.state_history,
          content: message.sms.message,
          due: message.due,
          link: !!message.doc.form
        };
      });
    };

    var getParams = function(tab, skip, limit, descending) {
      var list = {
        limit: limit || 25,
        skip: skip || 0,
        reduce: false,
        include_docs: true
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
                     $translate('admin.message.queue', {}, null, null, language.code);
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
              var extras = {
                doc: row.doc,
                context: {
                  patient_id: row.doc.patient_id || (row.doc.fields && row.doc.fields.patient_id),
                  patient_uuid: row.doc.patient_uuid || (row.doc.fields && row.doc.fields.patient_uuid)
                }
              };
              return Object.assign(extras, row.value);
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
                  total: results[2].rows.length ? results[2].rows[0].value : 0
                };
              });

          });
      }
    };
  }
);
