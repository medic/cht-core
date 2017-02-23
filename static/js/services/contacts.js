var _ = require('underscore'),
    async = require('async');

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
    ContactSchema.getTypes().forEach(function(type) {
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
    * Fetches all contacts for specified types (see ContactSchema.getTypes()).
    * If no types are specified, fetches for all contact types.
    * Watch out, that could be a lot of data.
    *
    * options {
    *   types: ['district_hospital', 'person']
    * }
    */
    return function(options) {
      options = options || {};

      if (!options.types || options.types.indexOf('person') !== -1) {
        // We want to remove as many of these as possible, because for admins
        // it involves downloading a _huge_ amount of data.
        console.trace('WARNING: call made to Contacts with the expectation of having person data');
      }

      var relevantCaches = (options.types ? options.types : ContactSchema.getTypes()).map(function(type) {
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
