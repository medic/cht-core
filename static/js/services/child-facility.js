angular.module('inboxServices').factory('ChildFacility',
  function(DbView) {

    'use strict';
    'ngInject';

    return function(parent) {
      var params = {
        group: true
      };
      if (parent.type === 'district_hospital') {
        // filter on district
        params.startkey = [ parent._id ];
        params.endkey = [ parent._id, {} ];
      } else if (parent.type === 'health_center') {
        // filter on health center
        params.startkey = [ parent.parent._id, parent._id ];
        params.endkey = [ parent.parent._id, parent._id, {} ];
      } else {
        throw new Error('Doc not currently supported.');
      }
      return DbView('total_clinics_by_facility', { params: params })
        .then(function(response) {
          return response.results;
        });
    };

  }
);