var utils = require('kujua-utils');

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

      var formatRecipients = function(recipients) {
        return _.uniq(
          _.flatten(_.map(recipients, function(r) {
            if (r.everyoneAt) {
              var ret = [];
              _.each(r.clinics, function(d) {
                if (d.doc.contact && d.doc.contact.phone) {
                  ret.push({
                    phone: d.doc.contact.phone,
                    facility: d.doc
                  });
                }
              });
              return ret;
            } else {
              return [{
                phone: r.doc.contact.phone,
                facility: r.doc
              }];
            }
          })),
          false,
          function(r) {
            return r.phone;
          }
        );
      };

      return function(recipients, message) {

        var deferred = $q.defer();

        User.query(function(user) {

          var doc = createMessageDoc(user, recipients);
          var explodedRecipients = formatRecipients(recipients);

          // TODO use async
          _.each(explodedRecipients, function(data, idx) {
            db.newUUID(100, function (err, uuid) {
              if (err) {
                return deferred.reject(err);
              }
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
              doc.tasks.push(task);
              // save doc only after all tasks have been added.
              if (idx+1 === explodedRecipients.length) {
                audit.saveDoc(doc, function(err) {
                  if (err) {
                    deferred.reject(err);
                  } else {
                    deferred.resolve();
                  }
                });
              }
            });
          });
        });

        return deferred.promise;
      };
    }
  ]);

}());