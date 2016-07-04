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

  inboxServices.factory('UserSettings',
    function(
      $q,
      DB,
      Session
    ) {
      'ngInject';
      return function() {
        var userCtx = Session.userCtx();
        if (!userCtx) {
          return $q.reject(new Error('UserCtx not found'));
        }
        return getWithRemoteFallback(DB, 'org.couchdb.user:' + userCtx.name);
      };
    }
  );

  inboxServices.factory('UserContact',
    function(
      DB,
      UserSettings
    ) {
      'ngInject';
      return function() {
        return UserSettings()
          .then(function(user) {
            return user.contact_id && DB().get(user.contact_id);
          });
      };
    }
  );

  inboxServices.factory('Admins',
    function(
      $http
    ) {
      'ngInject';
      return function() {
        return $http.get('/_config/admins', { cache: true });
      };
    }
  );

}());
