const lineageFactory = require('@medic/lineage');
const messageUtils = require('@medic/message-utils');
const registrationUtils = require('@medic/registration-utils');

angular.module('services').factory('MessageQueueUtils',
  function(
    $q,
    DB
  ) {

    'use strict';
    'ngInject';

    return {
      lineage: lineageFactory($q, DB({ remote: true })),
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

    const findSummary = function(summaries, message) {
      if (!message.sms || !message.sms.to) {
        return;
      }

      const summary = summaries.rows.find(function(summary) {
        return summary.value && summary.value.phone === message.sms.to;
      });

      return summary && summary.value;
    };

    const findIdByKey = (contactsByReference, key) => {
      const row = contactsByReference.rows.find((row) => row.key[1] === key);
      return row && row.id;
    };

    const findPatientUuid = (contactsByReference, message) => {
      return findIdByKey(contactsByReference, message.context.patient_id) || message.context.patient_uuid;
    };

    const findPlaceUuid = (contactsByReference, message) => {
      return findIdByKey(contactsByReference, message.context.place_id) || message.context.place_uuid;
    };

    const findRegistrations = (registrations, message, shortcodeField) => {
      return registrations
        .filter((row) => row.key === message.context[shortcodeField])
        .map((row) => row.doc);
    };

    const findContactById = function(hydratedContacts, contactId) {
      const contact = hydratedContacts.find(function(hydratedContact) {
        return hydratedContact.id === contactId;
      });

      return contact && contact.doc;
    };

    const getValidRegistrations = function(registrations, settings) {
      return registrations.rows.filter(function(row) {
        return MessageQueueUtils.registrations.isValidRegistration(row.doc, settings);
      });
    };

    const compactUnique = function(array) {
      return array.filter(function(item, idx, self) {
        return item && self.indexOf(item) === idx;
      });
    };

    const getRecipients = function(messages) {
      const phoneNumbers = compactUnique(messages.map(function(row) {
        return row.sms && row.sms.to;
      }));

      if (!phoneNumbers.length) {
        return messages;
      }

      return DB({ remote: true })
        .query('medic-client/contacts_by_phone', { keys: phoneNumbers })
        .then(function(contactsByPhone) {
          const ids = contactsByPhone.rows.map(function(row) {
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

    const getSubjectsAndRegistrations = (messages, settings) => {
      let shortcodes = [];
      messages.forEach(message => {
        if (message.sms) {
          // don't process items which already have generated messages
          return;
        }
        shortcodes.push(message.context.patient_id, message.context.place_id);
      });
      shortcodes = compactUnique(shortcodes);

      if (!shortcodes.length) {
        return Promise.resolve(messages);
      }

      const referenceKeys = shortcodes.map((shortcode) => [ 'shortcode', shortcode ]);

      return $q
        .all([
          DB({ remote: true }).query('medic-client/contacts_by_reference', { keys: referenceKeys }),
          DB({ remote: true }).query('medic-client/registered_patients', { keys: shortcodes, include_docs: true }),
        ])
        .then(([contactsByReference, registrations]) => {
          registrations = getValidRegistrations(registrations, settings);

          messages.forEach((message) => {
            message.context.patient_uuid = findPatientUuid(contactsByReference, message);
            message.context.place_uuid = findPlaceUuid(contactsByReference, message);
            message.context.registrations = findRegistrations(registrations, message, 'patient_id');
            message.context.placeRegistrations = findRegistrations(registrations, message, 'place_id');
          });

          return messages;
        });
    };

    const hydrateContacts = function(messages) {
      let contactIds = [];
      messages.forEach(function(message) {
        if (!message.sms) {
          contactIds.push(
            message.context.patient_uuid,
            message.doc.contact && message.doc.contact._id,
            message.context.place_uuid
          );
        }
      });
      contactIds = compactUnique(contactIds);
      if (!contactIds.length) {
        return messages;
      }

      return MessageQueueUtils.lineage
        .fetchLineageByIds(contactIds)
        .then(function(docList) {
          const hydratedDocs = docList.map(function(docs) {
            const doc = docs.shift();
            return {
              id: doc._id,
              doc: MessageQueueUtils.lineage.fillParentsInDocs(doc, docs)
            };
          });

          messages.forEach((message) => {
            message.context.patient = findContactById(hydratedDocs, message.context.patient_uuid);
            message.context.place = findContactById(hydratedDocs, message.context.place_uuid);
            message.doc.contact = findContactById(hydratedDocs, message.doc.contact && message.doc.contact._id);
          });

          return messages;
        });
    };

    const generateScheduledMessages = function(messages, settings) {
      const translate = function(key, locale) {
        return $translate.instant(key, null, 'no-interpolation', locale, null);
      };

      messages.forEach(function(message) {
        if (message.sms) {
          return;
        }

        const content = {
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

    const getTaskDisplayName = function(task) {
      if (task.translation_key) {
        return $translate.instant(task.translation_key, { group: task.group });
      }

      return task.type && task.type + (task.group ? ':' + task.group : '' ) || false;
    };

    const formatMessages = function(messages) {
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
          link: !!message.doc.form && message.doc.type === 'data_record',
          error: message.sms.error || false
        };
      });
    };

    const getParams = function(tab, skip, limit, descending) {
      const list = {
        limit: limit || 25,
        skip: skip || 0,
        reduce: false,
        include_docs: true
      };

      const count = {
        reduce: true,
        group_level: 1
      };

      let paging;
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
                     $translate('admin.message.queue', {}, null, 'admin.message.queue', language.code);
            }));
          })
          .catch(function(err) {
            $log.error('Error fetching languages', err);
            throw (err);
          });
      },

      query: function(tab, skip, limit, descending) {
        const params = getParams(tab, skip, limit, descending);
        return $q
          .all([
            Settings(),
            DB({ remote: true }).query('medic-admin/message_queue', params.list),
            DB({ remote: true }).query('medic-admin/message_queue', params.count)
          ])
          .then(([settings, messagesList, messagesCount]) => {
            const messages = messagesList.rows.map((row) => {
              const extras = {
                doc: row.doc,
                context: {
                  patient_id: row.doc.patient_id || (row.doc.fields && row.doc.fields.patient_id),
                  patient_uuid: row.doc.patient_uuid || (row.doc.fields && row.doc.fields.patient_uuid),
                  place_id: row.doc.place_id || (row.doc.fields && row.doc.fields.place_id),
                }
              };
              return Object.assign(extras, row.value);
            });

            return getSubjectsAndRegistrations(messages, settings)
              .then(hydrateContacts)
              .then((messages) => generateScheduledMessages(messages, settings))
              .then(getRecipients)
              .then((messages) => {
                return {
                  messages: formatMessages(messages),
                  total: messagesCount.rows.length ? messagesCount.rows[0].value : 0
                };
              });
          });
      }
    };
  });
