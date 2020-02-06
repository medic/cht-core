const _ = require('lodash/core');
_.uniqBy = require('lodash/uniqBy');
_.groupBy = require('lodash/groupBy');
const uuid = require('uuid/v4');
const taskUtils = require('@medic/task-utils');
const phoneNumber = require('@medic/phone-number');

angular
  .module('inboxServices')
  .factory('SendMessage', function(
    $ngRedux,
    $q,
    DB,
    ExtractLineage,
    MarkRead,
    ServicesActions,
    Settings,
    UserSettings
  ) {
    'use strict';
    'ngInject';

    const self = this;
    const mapDispatchToTarget = (dispatch) => {
      const servicesActions = ServicesActions(dispatch);
      return {
        setLastChangedDoc: servicesActions.setLastChangedDoc
      };
    };
    $ngRedux.connect(null, mapDispatchToTarget)(self);

    const identity = function(i) {
      return !!i;
    };

    const createMessageDoc = function(user) {
      return {
        errors: [],
        form: null,
        from: user && user.phone,
        reported_date: Date.now(),
        tasks: [],
        kujua_message: true,
        type: 'data_record',
        sent_by: (user && user.name) || 'unknown',
        _id: uuid()
      };
    };

    const mapRecipient = function(contact, phone) {
      if (phone) {
        const res = { phone: phone };
        if (contact) {
          res.contact = contact;
        }
        return res;
      }
    };

    const mapDescendants = function(results) {
      return results.rows.map(function(row) {
        const doc = row.doc;
        const phone = doc.phone || (doc.contact && doc.contact.phone);
        return mapRecipient(doc, phone);
      });
    };

    // Returns contacts and primary contacts for descendant hierarchies
    const descendants = function(recipient) {
      return DB()
        .query('medic-client/contacts_by_parent', {
          include_docs: true,
          startkey: [recipient.doc._id],
          endkey: [recipient.doc._id, {}]
        })
        .then(function(contacts) {
          const primaryContacts = _.filter(contacts.rows, function(row) {
            const contact = row.doc.contact;
            return contact && contact._id && !contact.phone;
          }).map(function(row) {
            return { doc: { _id: row.doc.contact._id } };
          });
          if (primaryContacts) {
            return hydrate(primaryContacts).then(function(primaries) {
              return _.flattenDeep([mapDescendants(contacts), primaries]);
            });
          } else {
            return mapDescendants(contacts);
          }
        });
    };

    const hydrate = function(recipients) {
      const ids = recipients.map(function(recipient) {
        return recipient.doc._id;
      });
      return DB()
        .allDocs({ include_docs: true, keys: ids })
        .then(mapDescendants);
    };

    const resolvePhoneNumbers = function(recipients) {
      //TODO: do we want to attempt to resolve phone numbers into existing contacts?
      // users will have already got that suggestion in the send-message UI if
      // it exists in the DB
      return recipients.map(function(recipient) {
        const phone =
          recipient.text || // from select2
          recipient.doc.phone ||
          recipient.doc.contact.phone; // from LHS message bar
        return mapRecipient(null, phone);
      });
    };

    const formatRecipients = function(recipients) {
      const splitRecipients = _.groupBy(recipients, function(recipient) {
        if (recipient.everyoneAt) {
          return 'explode';
        } else if (recipient.doc && recipient.doc._id) {
          return 'hydrate';
        } else {
          return 'resolve';
        }
      });

      splitRecipients.explode = splitRecipients.explode || [];
      splitRecipients.hydrate = splitRecipients.hydrate || [];
      splitRecipients.resolve = splitRecipients.resolve || [];

      const promises = _.flattenDeep([
        splitRecipients.explode.map(descendants),
        hydrate(splitRecipients.hydrate),
        resolvePhoneNumbers(splitRecipients.resolve),
      ]);

      return $q.all(promises).then(function(recipients) {
        // hydrate() and resolvePhoneNumbers() are promises with multiple values
        recipients = _.flattenDeep(recipients);

        // removes any undefined values caused by bad data
        const validRecipients = recipients.filter(identity);

        return _.uniqBy(validRecipients, function(recipient) {
          return recipient.phone;
        });
      });
    };

    const createTask = function(settings, recipient, message, user) {
      const task = {
        messages: [
          {
            from: user && user.phone,
            sent_by: (user && user.name) || 'unknown',
            to:
              phoneNumber.normalize(settings, recipient.phone) ||
              recipient.phone,
            contact: ExtractLineage(recipient.contact),
            message: message,
            uuid: uuid(),
          },
        ],
      };
      taskUtils.setTaskState(task, 'pending');
      return task;
    };

    return (recipients, message) => {
      if (!Array.isArray(recipients)) {
        recipients = [recipients];
      }
      return $q
        .all([UserSettings(), Settings(), formatRecipients(recipients)])
        .then(([ user, settings, explodedRecipients ]) => {
          const doc = createMessageDoc(user);
          doc.tasks = explodedRecipients.map(recipient => {
            return createTask(settings, recipient, message, user);
          });
          self.setLastChangedDoc(doc);
          return doc;
        })
        .then(doc => {
          return $q.all([
            DB().post(doc),
            MarkRead([ doc ])
          ]);
        });
    };
  });
