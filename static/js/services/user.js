var _ = require('underscore'),
    utils = require('kujua-utils');

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
        if (utils.isUserAdmin(userCtx)) {
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

  var getUserUrl = function(id) {
    return '/_users/' + encodeURIComponent(id);
  };

  var removeCacheEntry = function($cacheFactory, id) {
    var cache = $cacheFactory.get('$http');
    cache.remove(getUserUrl(id));
    cache.remove('/_users/_all_docs?include_docs=true');
    cache.remove('/_config/admins');
  };

  inboxServices.factory('UpdateUser', ['$log', '$cacheFactory', '$http', 'DB', 'Admins', '$q',
    function($log, $cacheFactory, $http, DB, Admins, $q) {

      var createId = function(name) {
        return 'org.couchdb.user:' + name;
      };

      var getOrCreateUser = function(id, name) {
        if (id) {
          return $http.get(getUserUrl(id), { cache: true, targetScope: 'root' })
            .then(function(result) { return result.data; });
        } else {
          return $q.when({
            _id: createId(name),
            type: 'user'
          });
        }
      };

      var getOrCreateUserSettings = function(id, name) {
        if (id) {
          return DB.get()
            .get(id);
        } else {
          return $q.when({
            _id: createId(name),
            type: 'user-settings'
          });
        }
      };


      var updatePassword = function(updated) {
        if (!updated.password) {
          // password not changed, do nothing
          return $q.when();
        }
        var deferred = $q.defer();
        Admins(function(err, admins) {
          if (err) {
            if (err.error === 'unauthorized') {
              // not an admin
              return deferred.resolve();
            }
            return deferred.reject(err);
          }
          if (!admins[updated.name]) {
            // not an admin so admin password change not required
            return deferred.resolve();
          }

          deferred.resolve($http.put('/_config/admins/' + updated.name, '"' + updated.password + '"'));
        });
        return deferred.promise;
      };

      var updateUser = function(id, updates) {
        if (!updates) {
          // only updating settings
          return $q.when();
        }
        return getOrCreateUser(id, updates.name)
          .then(function(user) {
            $log.debug('user being updated', user._id);
            var updated = _.extend(user, updates);
            if (updated.password) {
              updated.derived_key = undefined;
              updated.salt = undefined;
            }
            return $http
              .put(getUserUrl(user._id), updated)
              .then(function() {
                updatePassword(updated)
                  .then(function() {
                    removeCacheEntry($cacheFactory, user._id);
                    return updated;
                  })
                  .catch(function(err) {
                    removeCacheEntry($cacheFactory, user._id);
                    throw err;
                  });
                });
              });
      };

      var updateSettings = function(id, updates) {
        if (!updates) {
          // only updating user
          return $q.when();
        }
        return getOrCreateUserSettings(id, updates.name)
          .then(function(settings) {
            var updated = _.extend(settings, updates);
            return DB.get()
              .put(updated);
          });
      };

      return function(id, settingUpdates, userUpdates) {
        if (!id && !userUpdates) {
          $q.reject(new Error('Cannot update user settings without user'));
        }
        return updateUser(id, userUpdates)
          .then(function() {
            return updateSettings(id, settingUpdates);
          });
      };
    }
  ]);

  inboxServices.factory('DeleteUser', ['$cacheFactory', '$http', 'DeleteDoc',
    function($cacheFactory, $http, DeleteDoc) {

      var deleteUser = function(id, callback) {
        var url = getUserUrl(id);
        $http.get(url)
          .success(function(user) {
            user._deleted = true;
            $http.put(url, user)
              .success(function() {
                callback();
              })
              .error(function(data) {
                callback(new Error(data));
              });
          })
          .error(function(data) {
            callback(new Error(data));
          });
      };

      return function(user, callback) {
        var id = user.id;
        deleteUser(id, function(err) {
          if (err) {
            return callback(err);
          }
          removeCacheEntry($cacheFactory, id);
          DeleteDoc(id, callback);
        });
      };
    }
  ]);

}());
