var _ = require('underscore'),
    utils = require('kujua-utils'),
    async = require('async'),
    libphonenumber = require('libphonenumber/utils');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  inboxServices.factory('SendMessage', ['$q', 'db', 'User', 'Settings',
    function($q, db, User, Settings) {

      var createMessageDoc = function(user, recipients) {
        var name = user && user.name;
        var doc = {
          errors: [],
          form: null,
          from: user && user.phone,
          reported_date: Date.now(),
          related_entities: {},
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
          doc.related_entities[facility.type] = facility;
        }

        return doc;
      };

      var mapRecipients = function(recipients) {
        var results = _.filter(recipients, function(recipient) {
          return recipient.doc.phone ||
                 recipient.doc.contact && recipient.doc.contact.phone;
        });
        return _.map(results, function(recipient) {
          return {
            phone: recipient.doc.phone || recipient.doc.contact.phone,
            facility: recipient.doc
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
            facility: data.facility._id ? data.facility : undefined,
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

        User(function(err, user) {
          if (err) {
            return console.log('Error fetching user', err);
          }

          Settings(function(err, settings) {
            if (err) {
              return console.log('Error fetching settings', err);
            }

            var doc = createMessageDoc(user, recipients);
            var explodedRecipients = formatRecipients(recipients);

            async.forEachSeries(
              explodedRecipients,
              function(data, callback) {
                db.newUUID(100, function (err, uuid) {
                  if (!err) {
                    doc.tasks.push(createTask(settings, data, message, user, uuid));
                  }
                  callback(err);
                });
              },
              function(err) {
                if (err) {
                  return deferred.reject(err);
                }
                db.saveDoc(doc, function(err) {
                  if (err) {
                    deferred.reject(err);
                  } else {
                    deferred.resolve();
                  }
                });
              }
            );
          });
        });

        return deferred.promise;
      };
    }
  ]);

}());