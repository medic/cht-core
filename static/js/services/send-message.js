var utils = require('kujua-utils'),
    async = require('async');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  inboxServices.factory('SendMessage', ['$q', 'db', 'audit', 'User',
    function($q, db, audit, User) {

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
          return recipient.doc.contact && recipient.doc.contact.phone;
        });
        return _.map(results, function(recipient) {
          return {
            phone: recipient.doc.contact.phone,
            facility: recipient.doc
          };
        });
      };

      var formatRecipients = function(recipients) {
        var result = _.flatten(_.map(recipients, function(r) {
          return mapRecipients(r.everyoneAt ? r.clinics : [r]);
        }));
        return _.uniq(result, false, function(r) {
          return r.phone;
        });
      };

      var createTask = function(data, message, user, uuid) {
        var task = {
          messages: [{
            from: user && user.phone,
            sent_by: user && user.name || 'unknown',
            to: data.phone,
            facility: data.facility,
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

        User.query(function(user) {
          var doc = createMessageDoc(user, recipients);
          var explodedRecipients = formatRecipients(recipients);

          async.forEachSeries(
            explodedRecipients, 
            function(data, callback) {
              db.newUUID(100, function (err, uuid) {
                if (!err) {
                  doc.tasks.push(createTask(data, message, user, uuid));
                }
                callback(err);
              });
            },
            function(err) {
              if (err) {
                return deferred.reject(err);
              }
              audit.saveDoc(doc, function(err) {
                if (err) {
                  deferred.reject(err);
                } else {
                  deferred.resolve();
                }
              });
            }
          );
        });

        return deferred.promise;
      };
    }
  ]);

}());