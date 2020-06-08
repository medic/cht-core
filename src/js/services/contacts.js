const _ = require('lodash/core');

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
                callback(null, _.map(result.rows, 'doc'));
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
        // For admins this involves downloading a _huge_ amount of data.
        return $q.reject(new Error('Call made to Contacts requesting no types'));
      }
      return init.then(cacheByType => {
        const relevantCaches = types.map(type => {
          const deferred = $q.defer();
          cacheByType[type]((err, result) => {
            if (err) {
              return deferred.reject(err);
            }
            deferred.resolve(result);
          });
          return deferred.promise;
        });
        return $q.all(relevantCaches).then(results => _.flattenDeep(results));
      });

    };
  }
);
