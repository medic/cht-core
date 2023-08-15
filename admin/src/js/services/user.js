(function () {

  'use strict';

  angular.module('inboxServices').factory('UserSettings',
    function(
      $q,
      Cache,
      DB,
      Session
    ) {
      'ngInject';

      const userDocId = () => {
        const userCtx = Session.userCtx();
        if (userCtx) {
          return 'org.couchdb.user:' + userCtx.name;
        }
      };

      const cache = Cache({
        get: callback => {
          const docId = userDocId();
          DB()
            .get(docId)
            .catch(() => {
              // might be first load - try the remote db
              return DB({ remote: true }).get(docId);
            })
            .then(doc => {
              callback(null, doc);
            })
            .catch(callback);
        },
        invalidate: change => {
          const docId = userDocId();
          return change.id === docId;
        }
      });

      return function() {
        const docId = userDocId();
        if (!docId) {
          return $q.reject(new Error('UserCtx not found'));
        }

        const deferred = $q.defer();
        cache((err, settings) => {
          if (err) {
            return deferred.reject(err);
          }
          deferred.resolve(settings);
        });
        return deferred.promise;
      };
    });

}());
