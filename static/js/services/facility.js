var _ = require('underscore'),
    async = require('async');

angular.module('inboxServices').factory('Facility',
  function(
    $log,
    $q,
    Cache,
    CONTACT_TYPES,
    DbView
  ) {

    'use strict';
    'ngInject';

    var cacheByType = {};
    CONTACT_TYPES.forEach(function(type) {
      cacheByType[type] = Cache({
        get: function(callback) {
          DbView('facilities', { params: { include_docs: true, key: [type] } })
            .then(function(data) {
              callback(null, data.results);
            })
            .catch(callback);
        },
        invalidate: function(doc) {
          return doc.type === type;
        }
      });
    });

    return function(options) {
      options = options || {};

      if (!options.types || options.types.indexOf('person') !== -1) {
        // We want to remove as many of these as possible, because for admins
        // it involves downloading a _huge_ amount of data.
        $log.warn(new Error('A call to facility with the expectation of having person data'));
      }

      var relevantCaches = (options.types ? options.types : CONTACT_TYPES).map(function(type) {
        return cacheByType[type];
      });
      var deferred = $q.defer();
      async.parallel(relevantCaches, function(err, results) {
        if (err) {
          return deferred.reject(err);
        }
        deferred.resolve(_.flatten(results));
      });
      return deferred.promise;
    };
  }
);
