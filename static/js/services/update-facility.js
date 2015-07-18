var _ = require('underscore');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  inboxServices.factory('UpdateFacility', ['db',
    function(db) {
      return function(messageId, facilityId, callback) {
        db.getDoc(messageId, function(err, message) {
          if (err) {
            return callback(err);
          }
          db.getDoc(facilityId, function(err, facility) {
            if (err) {
              return callback(err);
            }
            if (!message.related_entities) {
              message.related_entities = {};
            }
            if (!message.related_entities.clinic) {
              message.related_entities.clinic = {};
            }
            if (facility.type === 'health_center') {
              message.related_entities.clinic = { parent: facility };
            } else {
              message.related_entities.clinic = facility;
            }
            if (message.related_entities.clinic) {
              message.errors = _.filter(message.errors, function(error) {
                return error.code !== 'sys.facility_not_found';
              });
            }
            db.saveDoc(message, function(err) {
              callback(err, message);
            });
          });
        });
      };
    }
  ]);

}());
