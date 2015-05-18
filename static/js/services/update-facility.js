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
            message.contact = facility;
            if (facility) {
              message.errors = _.reject(message.errors, function(error) {
                return error.code === 'sys.facility_not_found';
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