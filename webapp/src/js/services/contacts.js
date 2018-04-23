var _ = require('underscore'),
    parallel = require('async/parallel');

angular.module('inboxServices').factory('Contacts',
  function(
    $log,
    $q,
    Cache,
    ContactSchema,
    DB
  ) {

    'use strict';
    'ngInject';

    var cacheByType = {};
    ContactSchema.getPlaceTypes().forEach(function(type) {
      cacheByType[type] = Cache({
        get: function(callback) {
          DB().query('medic-client/contacts_by_type', { include_docs: true, key: [type] })
            .then(function(result) {
              callback(null, _.pluck(result.rows, 'doc'));
            })
            .catch(callback);
        },
        invalidate: function(doc) {
          return doc.type === type;
        }
      });
    });

    /**
     * Fetches all contacts for specified types (see ContactSchema.getPlaceTypes()).
     *
     * @param: types (array), eg: ['district_hospital', 'clinic']
     */
    return function(types) {
      var deferred = $q.defer();
      if (!types || types.indexOf('person') !== -1) {
        // For admins this involves downloading a _huge_ amount of data.
        return deferred.reject(new Error('Call made to Contacts requesting Person data'));
      }
      var relevantCaches = types.map(function(type) {
        return cacheByType[type];
      });
      parallel(relevantCaches, function(err, results) {
        if (err) {
          return deferred.reject(err);
        }
        deferred.resolve(_.flatten(results));
      });
      return deferred.promise;
    };
  }
);
