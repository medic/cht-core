var _ = require('underscore');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  var getUserUrl = function(id) {
    return '/_users/' + encodeURIComponent(id);
  };

  var removeCacheEntry = function($cacheFactory, id) {
    var cache = $cacheFactory.get('$http');
    cache.remove(getUserUrl(id));
    cache.remove('/_users/_all_docs?include_docs=true');
    cache.remove('/_config/admins');
  };

  inboxServices.factory('UpdateUser',
    function(
      $cacheFactory,
      $http,
      $q,
      $log,
      Admins,
      DB
    ) {

      'ngInject';

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
          return DB()
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
            return DB()
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
  );

  inboxServices.factory('DeleteUser',
    function(
      $cacheFactory,
      $http,
      DB,
      DeleteDocs
    ) {

      'ngInject';

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
          DB()
            .get(id)
            .then(DeleteDocs)
            .then(callback)
            .catch(callback);
        });
      };
    }
  );

}());
