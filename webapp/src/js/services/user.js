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

      var cache = Cache({
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

        var deferred = $q((resolve, reject) => {
          cache((err, settings) => {
            if (err) {
              return reject(err);
            }
            resolve(settings);
          });
        });

        return deferred;
      };
    }
  );

}());
