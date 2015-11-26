var _ = require('underscore'),
    utils = require('kujua-utils'),
    async = require('async'),
    libphonenumber = require('libphonenumber/utils');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  inboxServices.factory('SendMessage', ['$q', 'DB', 'UserSettings', 'Settings',
    function($q, DB, UserSettings, Settings) {

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
        var deferred = $q.defer();
        if (!_.isArray(recipients)) {
          recipients = [recipients];
        }
        UserSettings(function(err, user) {
          if (err) {
            return deferred.reject(err);
          }
          Settings(function(err, settings) {
            if (err) {
              return deferred.reject(err);
            }
            var doc = createMessageDoc(user, recipients);
            var explodedRecipients = formatRecipients(recipients);
            async.forEachSeries(
              explodedRecipients,
              function(data, callback) {
                DB.get()
                  .id()
                  .then(function(id) {
                    doc.tasks.push(createTask(settings, data, message, user, id));
                    callback();
                  })
                  .catch(function(err) {
                    callback(err);
                  });
              },
              function(err) {
                if (err) {
                  return deferred.reject(err);
                }
                DB.get()
                  .post(doc)
                  .then(deferred.resolve)
                  .catch(deferred.reject);
              }
            );
          });
        });
        return deferred.promise;
      };
    }
  ]);

}());