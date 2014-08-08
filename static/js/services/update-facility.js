(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');
  
  inboxServices.factory('UpdateFacility', ['db', 'audit',
    function(db, audit) {
      return function(messageId, facilityId) {
        db.getDoc(messageId, function(err, message) {
          if (err) {
            return console.log(err);
          }
          db.getDoc(facilityId, function(err, facility) {
            if (err) {
              return console.log(err);
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
            audit.saveDoc(message, function(err) {
              if (err) {
                console.log(err);
              }
            });
          });
        });
      };
    }
  ]);

}());