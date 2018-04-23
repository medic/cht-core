var _ = require('underscore'),
    uuid = require('uuid/v4'),
    taskUtils = require('task-utils'),
    phoneNumber = require('phone-number');

angular.module('inboxServices').factory('SendMessage',
  function(
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
      return  {
        errors: [],
        form: null,
        from: user && user.phone,
        reported_date: Date.now(),
        tasks: [],
        kujua_message: true,
        type: 'data_record',
        sent_by: (user && user.name) || 'unknown'
      };
    };

    // Takes a collection of results either exploded from the DB or
    // directly from a local raw result such as select2 and attempts to
    // coerse it all into the same format
    var mapRecipients = function(recipients) {
      return recipients.map(function(recipient) {
        if (typeof recipient === 'string') {
          return {
            phone: recipient,
          };
        }

        recipient = recipient.doc;

        if (recipient.phone) {
          return {
            phone: recipient.phone,
            contact: recipient
          };
        } else if (recipient.contact && recipient.contact.phone) {
          return {
            phone: recipient.contact.phone,
            contact: recipient
          };
        }
      });
    };

    var descendants = function(recipient) {
      return DB().query('medic-client/contacts_by_parent', {
        include_docs: true,
        key: recipient.doc._id
      }).then(function(results) {
        return results.rows;
      });
    };

    var hydrate = function(recipients) {
     return DB().allDocs({
      include_docs: true,
      keys: _.pluck(_.pluck(recipients, 'doc'), '_id')
     }).then(function(results) {
      return results.rows;
     });
    };

    var resolvePhoneNumbers = function(recipients) {
      //TODO: do we want to attempt to resolve phone numbers into existing contacts?
      // users will have already got that suggestion in the send-message UI if
      // it exists in the DB
      return recipients.map(function(recipient) {
        return recipient.text || // from select2
               recipient.doc.contact.phone; // from LHS message bar
      });
    };

    var formatRecipients = function(recipients) {
      var splitRecipients = _.groupBy(recipients, function(recipient) {
        if (recipient.everyoneAt) {
          return 'explode';
        } else if (recipient.doc && recipient.doc._id){
          return 'hydrate';
        } else {
          return 'resolve';
        }
      });

      splitRecipients.explode = splitRecipients.explode || [];
      splitRecipients.hydrate = splitRecipients.hydrate || [];
      splitRecipients.resolve = splitRecipients.resolve || [];

      var promises = _.flatten(
        [splitRecipients.explode.map(descendants),
        hydrate(splitRecipients.hydrate),
        resolvePhoneNumbers(splitRecipients.resolve)]
      );

      return $q.all(promises).then(function(recipients) {
        // hydrate() and resolvePhoneNumbers() are promises with multiple values
        recipients = _.flatten(recipients);

        // removes any undefined values caused by bad data
        var validRecipients = mapRecipients(recipients).filter(identity);

        return _.uniq(validRecipients, false, function(recipient) {
          return recipient.phone;
        });
      });
    };

    var createTask = function(settings, recipient, message, user) {
      var task = {
        messages: [{
          from: user && user.phone,
          sent_by: user && user.name || 'unknown',
          to: phoneNumber.normalize(settings, recipient.phone) || recipient.phone,
          contact: ExtractLineage(recipient.contact),
          message: message,
          uuid: uuid()
        }]
      };
      taskUtils.setTaskState(task, 'pending');
      return task;
    };

    return function(recipients, message) {
      if (!_.isArray(recipients)) {
        recipients = [recipients];
      }
      return $q.all([
        UserSettings(),
        Settings(),
        formatRecipients(recipients)
      ])
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
  }
);
