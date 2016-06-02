var utils = require('kujua-utils');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  var getWithRemoteFallback = function(DB, id, callback) {
    DB.get()
      .get(id)
      .then(function(response) {
        callback(null, response);
      })
      .catch(function() {
        // might be first load - try the remote db
        DB.getRemote()
          .get(id)
          .then(function(response) {
            callback(null, response);
          })
          .catch(callback);
      });
  };

  inboxServices.factory('UserDistrict', ['DB', 'UserSettings', 'Session',
    function(DB, UserSettings, Session) {
      return function(callback) {
        var userCtx = Session.userCtx();
        if (!userCtx || !userCtx.name) {
          return callback(new Error('Not logged in'));
        }
        if (Session.isAdmin()) {
          return callback();
        }
        if (!utils.isUserDistrictAdmin(userCtx)) {
          return callback(new Error('The administrator needs to give you additional privileges to use this site.'));
        }
        UserSettings(function(err, user) {
          if (err) {
            return callback(err);
          }
          if (!user.facility_id) {
            return callback(new Error('No district assigned to district admin.'));
          }
          // ensure the facility exists
          getWithRemoteFallback(DB, user.facility_id, function(err) {
            callback(err, user.facility_id);
          });
        });
      };
    }
  ]);

  inboxServices.factory('UserSettings', ['DB', 'Session',
    function(DB, Session) {
      return function(callback) {
        var userCtx = Session.userCtx();
        if (!userCtx) {
          return callback(new Error('UserCtx not found.'));
        }
        getWithRemoteFallback(DB, 'org.couchdb.user:' + userCtx.name, callback);
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
            DB.get().get(user.contact_id).then(resolve).catch(reject);
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
