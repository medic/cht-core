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
        }
        return $q.when({
          _id: createId(name),
          type: 'user'
        });
      };

      var getOrCreateUserSettings = function(id, name) {
        if (id) {
          return DB().get(id);
        }
        return $q.when({
          _id: createId(name),
          type: 'user-settings'
        });
      };

      var updateAdminPassword = function(updated) {
        if (!updated.password) {
          // password not changed, do nothing
          return $q.when();
        }
        return Admins()
          .then(function(admins) {
            if (admins[updated.name]) {
              // an admin so admin password change required
              return $http.put(
                '/_config/admins/' + updated.name,
                '"' + updated.password + '"'
              );
            }
          })
          .catch(function(err) {
            if (err.status !== 401) {
              throw err;
            }
            // else unauthorized - not an admin
          });
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
            return $http.put(getUserUrl(user._id), updated)
              .then(function() {
                return updateAdminPassword(updated);
              })
              .then(function() {
                removeCacheEntry($cacheFactory, user._id);
                return updated;
              })
              .catch(function(err) {
                removeCacheEntry($cacheFactory, user._id);
                throw err;
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

      var deleteCouchUser = function(id) {
        var url = getUserUrl(id);
        return $http.get(url)
          .then(function(response) {
            var user = response.data;
            user._deleted = true;
            return $http.put(url, user);
          });
      };

      var deleteMedicUser = function(id) {
        return DB().get(id).then(DeleteDocs);
      };

      return function(user) {
        return deleteCouchUser(user._id)
          .then(function() {
            return deleteMedicUser(user._id);
          })
          .then(function() {
            removeCacheEntry($cacheFactory, user._id);
          });
      };
    }
  );

}());
