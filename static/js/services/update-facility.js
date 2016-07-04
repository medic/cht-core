var _ = require('underscore');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');
  
  inboxServices.factory('UpdateFacility',
    function(
      $q,
      DB
    ) {
      'ngInject';
      return function(messageId, facilityId) {
        return $q.all([
          DB().get(messageId),
          DB().get(facilityId)
        ])
          .then(function(results) {
            var message = results[0];
            var facility = results[1];
            message.contact = facility;
            if (facility) {
              message.errors = _.reject(message.errors, function(error) {
                return error.code === 'sys.facility_not_found';
              });
            }
            return message;
          })
          .then(function(message) {
            return DB().put(message);
          });
      };
    }
  );

}());