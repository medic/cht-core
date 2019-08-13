var _ = require('underscore'),
    parallel = require('async/parallel');

angular.module('inboxServices').factory('Contacts',
  function(
    $q,
    Cache,
    ContactTypes,
    DB
  ) {

    'use strict';
    'ngInject';

    const init = ContactTypes.getPlaceTypes().then(types => {
      const cacheByType = {};
      types.forEach(type => {
        cacheByType[type.id] = Cache({
          get: function(callback) {
            DB().query('medic-client/contacts_by_type', { include_docs: true, key: [type.id] })
              .then(function(result) {
                callback(null, _.pluck(result.rows, 'doc'));
              })
              .catch(callback);
          },
          invalidate: function(doc) {
            return type.id === (doc.contact_type || doc.type);
          }
        });
      });
      return cacheByType;
    });

    /**
     * Fetches all contacts for specified types
     *
     * @param: types (array), eg: ['district_hospital', 'clinic']
     */
    return function(types) {
      if (!types) {
        return $q.reject(new Error('Call made to Contacts requesting no types'));
      }
      return init.then(cacheByType => {
        const deferred = $q.defer();
        const relevantCaches = types.map(type => cacheByType[type]);
        if (!relevantCaches.length) {
          // For admins this involves downloading a _huge_ amount of data.
          return deferred.reject(new Error('Call made to Contacts requesting Person data or unknown contact types'));
        }
        parallel(relevantCaches, function(err, results) {
          if (err) {
            return deferred.reject(err);
          }
          deferred.resolve(_.flatten(results));
        });
        return deferred.promise;
      });

    };
  }
);
