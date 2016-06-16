var utils = require('kujua-utils');

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
        if (Session.isAdmin()) {
          return $q.resolve();
        }
        if (!utils.isUserDistrictAdmin(userCtx)) {
          return $q.reject(new Error('The administrator needs to give you additional privileges to use this site.'));
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

  inboxServices.factory('UserSettings', ['DB', 'Session',
    function(DB, Session) {
      return function(callback) {
        var userCtx = Session.userCtx();
        if (!userCtx) {
          return callback(new Error('UserCtx not found.'));
        }
        getWithRemoteFallback(DB, 'org.couchdb.user:' + userCtx.name)
          .then(function(user) {
            callback(null, user);
          })
          .catch(callback);
      };
    }
  ]);

  inboxServices.factory('UserContact', ['$q', 'DB', 'UserSettings',
    function($q, DB, UserSettings) {
      return function() {
        return $q(function(resolve, reject) {
          UserSettings(function(err, user) {
            if (err) {
              return reject(err);
            }
            if (!user.contact_id) {
              return resolve();
            }
            DB().get(user.contact_id).then(resolve).catch(reject);
          });
        });
      };
    }
  ]);

  inboxServices.factory('Admins', ['$http',
    function($http) {
      return function(callback) {
        $http.get('/_config/admins', { cache: true })
          .success(function(data) {
            callback(null, data);
          })
          .error(callback);
      };
    }
  ]);

}());
