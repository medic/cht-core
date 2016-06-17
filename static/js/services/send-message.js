var _ = require('underscore'),
    utils = require('kujua-utils'),
    libphonenumber = require('libphonenumber/utils');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  inboxServices.factory('SendMessage',
    function(
      $q,
      DB,
      Settings,
      UserSettings
    ) {

      'ngInject';

      var createMessageDoc = function(user, recipients) {
        var name = user && user.name;
        var doc = {
          errors: [],
          form: null,
          from: user && user.phone,
          reported_date: Date.now(),
          tasks: [],
          read: [ name ],
          kujua_message: true,
          type: 'data_record',
          sent_by: name || 'unknown'
        };

        var facility = _.find(recipients, function(data) {
          return data.doc && data.doc.type;
        });
        if (facility && facility.type) {
          doc.contact = facility;
        }

        return doc;
      };

      var mapRecipients = function(recipients) {
        var results = _.filter(recipients, function(recipient) {
          return recipient.phone ||
                 recipient.contact && recipient.contact.phone;
        });
        return _.map(results, function(recipient) {
          return {
            phone: recipient.phone || recipient.contact.phone,
            facility: recipient
          };
        });
      };

      var formatRecipients = function(recipients) {
        var result = _.flatten(_.map(recipients, function(r) {
          return mapRecipients(r.everyoneAt ? r.descendants : [ r ]);
        }));
        return _.uniq(result, false, function(r) {
          return r.phone;
        });
      };

      var createTask = function(settings, data, message, user, uuid) {
        var task = {
          messages: [{
            from: user && user.phone,
            sent_by: user && user.name || 'unknown',
            to: libphonenumber.format(settings, data.phone) || data.phone,
            contact: data.facility._id ? data.facility : undefined,
            message: message,
            uuid: uuid
          }]
        };
        utils.setTaskState(task, 'pending');
        return task;
      };

      return function(recipients, message) {
        if (!_.isArray(recipients)) {
          recipients = [recipients];
        }
        return $q.all([
          UserSettings(),
          Settings()
        ])
          .then(function(results) {
            var user = results[0];
            var settings = results[1];
            var doc = createMessageDoc(user, recipients);
            var explodedRecipients = formatRecipients(recipients);
            return $q.all(explodedRecipients.map(function(data) {
              return DB().id().then(function(id) {
                return createTask(settings, data, message, user, id);
              });
            }))
              .then(function(tasks) {
                doc.tasks = tasks;
                return doc;
              });
          })
          .then(function(doc) {
            return DB().post(doc);
          });
      };
    }
  );

}());