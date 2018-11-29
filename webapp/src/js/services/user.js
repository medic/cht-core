(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  var getWithRemoteFallback = function(DB, id) {
    return DB()
      .get(id)
      .catch(function() {
        // might be first load - try the remote db
        return DB({ remote: true }).get(id);
      });
  };

  inboxServices.factory('UserSettings',
    function(
      $q,
      DB,
      Session
    ) {
      'ngInject';

      const userDocId = function () {
        const userCtx = Session.userCtx();
        if (userCtx) {
          return 'org.couchdb.user:' + userCtx.name;
        }
      };

      let userDoc;
      return function() {
        if (userDoc) {
          return userDoc;
        }

        const docId = userDocId();
        if (!docId) {
          return $q.reject(new Error('UserCtx not found'));
        }
      
        userDoc = getWithRemoteFallback(DB, docId);
        return userDoc;
      };
    }
  );

}());
