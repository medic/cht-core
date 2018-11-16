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
        return getWithRemoteFallback(DB, 'org.couchdb.user:' + userCtx.name)
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
      Session,
      Cache
    ) {
      'ngInject';

      const userDocId = () => {
        const userCtx = Session.userCtx();
        if (!userCtx) {
          return undefined;
        }
        
        return 'org.couchdb.user:' + userCtx.name;
      };

      const cache = Cache({
        get: function(callback) {
          getWithRemoteFallback(DB, userDocId())
            .then(doc => callback(null, doc))
            .catch(err => callback(err));
        },
        invalidate: function(doc) {
          return doc._id === userDocId();
        }
      });
    
      return function() {
        return $q(function (resolve, reject) {
          cache(function (err, userDoc) {
            if (err) {
              return reject(err);
            }
            return resolve(userDoc);
          });
        });
      };
    }
  );

}());
