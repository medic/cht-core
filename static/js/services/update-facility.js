var _ = require('underscore');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');
  
  inboxServices.factory('UpdateFacility', ['DB',
    function(DB) {
      return function(messageId, facilityId, callback) {
        DB()
          .get(messageId)
          .then(function(message) {
            DB()
              .get(facilityId)
              .then(function(facility) {
                message.contact = facility;
                if (facility) {
                  message.errors = _.reject(message.errors, function(error) {
                    return error.code === 'sys.facility_not_found';
                  });
                }
                DB()
                  .put(message)
                  .then(function(response) {
                    message._rev = response._rev;
                    callback(null, message);
                  })
                  .catch(callback);
              })
              .catch(callback);
          })
          .catch(callback);
      };
    }
  ]);

}());