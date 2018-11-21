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

  // If the user has role district_admin, returns their facility_id.
  // If the user is admin, return undefined.
  // Else throw error.
  inboxServices.factory('UserDistrict',
    function(
      $q,
      DB,
      UserSettings,
      Session
    ) {
      'ngInject';

      return function() {
        var userCtx = Session.userCtx();
        if (!userCtx || !userCtx.name) {
          return $q.reject(new Error('Not logged in'));
        }
        if (Session.isOnlineOnly(userCtx)) {
          return $q.resolve();
        }
        return UserSettings()
          .then(function(user) {
            if (!user.facility_id) {
              return $q.reject(new Error('No district assigned to district admin.'));
            }
            return user.facility_id;
          })
          .then(function(facilityId) {
            // ensure the facility exists
            return getWithRemoteFallback(DB, facilityId)
              .then(function() {
                return facilityId;
              });
          });
      };
    }
  );

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
