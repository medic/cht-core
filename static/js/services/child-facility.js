angular.module('inboxServices').factory('ChildFacility',
  function(DbView) {

    'use strict';
    'ngInject';

    return function(parent, callback) {
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
        return callback('Doc not currently supported.');
      }
      DbView('total_clinics_by_facility', { params: params })
        .then(function(data) {
          callback(null, data.results);
        })
        .catch(callback);
    };

  }
);