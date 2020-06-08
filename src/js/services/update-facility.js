const _ = require('lodash/core');

angular.module('inboxServices').factory('UpdateFacility',
  function(
    $q,
    DB,
    ExtractLineage
  ) {
    'use strict';
    'ngInject';
    return function(messageId, facilityId) {
      return $q.all([
        DB().get(messageId),
        DB().get(facilityId)
      ])
        .then(function(results) {
          const message = results[0];
          const facility = results[1];
          message.contact = ExtractLineage(facility);
          if (facility) {
            message.errors = _.filter(message.errors, function(error) {
              return error.code !== 'sys.facility_not_found';
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
