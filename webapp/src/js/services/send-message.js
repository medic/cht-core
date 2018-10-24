var _ = require('underscore'),
  uuid = require('uuid/v4'),
  taskUtils = require('task-utils'),
  phoneNumber = require('phone-number');

angular
  .module('inboxServices')
  .factory('SendMessage', function(
    $q,
    DB,
    ExtractLineage,
    Settings,
    UserSettings
  ) {
    'use strict';
    'ngInject';

    var identity = function(i) {
      return !!i;
    };

    var createMessageDoc = function(user) {
      return {
        errors: [],
        form: null,
        from: user && user.phone,
        reported_date: Date.now(),
        tasks: [],
        kujua_message: true,
        type: 'data_record',
        sent_by: (user && user.name) || 'unknown',
      };
    };

    var mapRecipient = function(contact, phone) {
      if (phone) {
        var res = { phone: phone };
        if (contact) {
          res.contact = contact;
        }
        return res;
      }
    };

    var mapDescendants = function(results) {
      return results.rows.map(function(row) {
        var doc = row.doc;
        var phone = doc.phone || (doc.contact && doc.contact.phone);
        return mapRecipient(doc, phone);
      });
    };

    // Returns contacts and primary contacts for descendant hierarchies
    var descendants = function(recipient) {
      return DB()
        .query('medic-client/contacts_by_parent', {
          include_docs: true,
          key: recipient.doc._id,
        })
        .then(function(contacts) {
          var primaryContacts = _.filter(contacts.rows, function(row) {
            var contact = row.doc.contact;
            return contact && contact._id && !contact.phone;
          }).map(function(row) {
            return { doc: { _id: row.doc.contact._id } };
          });
          if (primaryContacts) {
            return hydrate(primaryContacts).then(function(primaries) {
              return _.flatten([mapDescendants(contacts), primaries]);
            });
          } else {
            return mapDescendants(contacts);
          }
        });
    };

    var hydrate = function(recipients) {
      var ids = recipients.map(function(recipient) {
        return recipient.doc._id;
      });
      return DB()
        .allDocs({ include_docs: true, keys: ids })
        .then(mapDescendants);
    };

    var resolvePhoneNumbers = function(recipients) {
      //TODO: do we want to attempt to resolve phone numbers into existing contacts?
      // users will have already got that suggestion in the send-message UI if
      // it exists in the DB
      return recipients.map(function(recipient) {
        var phone =
          recipient.text || // from select2
          recipient.doc.phone ||
          recipient.doc.contact.phone; // from LHS message bar
        return mapRecipient(null, phone);
      });
    };

    var formatRecipients = function(recipients) {
      var splitRecipients = _.groupBy(recipients, function(recipient) {
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

      var promises = _.flatten([
        splitRecipients.explode.map(descendants),
        hydrate(splitRecipients.hydrate),
        resolvePhoneNumbers(splitRecipients.resolve),
      ]);

      return $q.all(promises).then(function(recipients) {
        // hydrate() and resolvePhoneNumbers() are promises with multiple values
        recipients = _.flatten(recipients);

        // removes any undefined values caused by bad data
        var validRecipients = recipients.filter(identity);

        return _.uniq(validRecipients, false, function(recipient) {
          return recipient.phone;
        });
      });
    };

    var createTask = function(settings, recipient, message, user) {
      var task = {
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

    return function(recipients, message) {
      if (!_.isArray(recipients)) {
        recipients = [recipients];
      }
      return $q
        .all([UserSettings(), Settings(), formatRecipients(recipients)])
        .then(function(results) {
          var user = results[0];
          var settings = results[1];
          var explodedRecipients = results[2];
          var doc = createMessageDoc(user);
          doc.tasks = explodedRecipients.map(function(recipient) {
            return createTask(settings, recipient, message, user);
          });
          return doc;
        })
        .then(function(doc) {
          return DB().post(doc);
        });
    };
  });
