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
  };

  // TODO delete this
  inboxServices.factory('UpdateUser',
    function(
      $cacheFactory,
      $http,
      $q,
      $log,
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
              delete updated.derived_key;
              delete updated.salt;
            }
            return $http.put(getUserUrl(user._id), updated)
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

  inboxServices.factory('UpdateUserV2',
    function(
      $http,
      $location,
      $log
    ) {
      'ngInject';


      /**
       * Uses the user api to store user updates.
       *
       * Updates are in the style of the /api/v1/users/{username} service, see
       * its documentation for more details.
       *
       * If you pass a username as password this will be used as Basic Auth to
       * the api (required for password updates). Otherwise it will use your
       * existing cookie.
       *
       * @param      {String}  username       The user you wish to update, without org.couchdb.user:
       * @param      {Object}  updates        Updates you wish to make
       * @param      {String}  basicAuthUser  Optional username for Basic Auth
       * @param      {String}  basicAuthPass  Optional password for Basic Auth
       */
      return function(username, updates, basicAuthUser, basicAuthPass) {
        var url = '/api/v1/users/' + username;

        if (basicAuthUser) {
          url = [
            $location.protocol(), '://', basicAuthUser, ':', basicAuthPass, '@',
            $location.host(), ':', $location.port(), url
          ].join('');
        }

        $log.debug('UpdateUser', url);

        return $http({
          method: 'POST',
          url: url,
          data: updates,
          headers: {
            'Content-Type': 'application/json'
          }
        });
      };
  });

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
          .catch(function(err) {
            if (err.status !== 404) {
              throw err;
            }
            // CouchDB user already deleted - attempt to delete the medic user
          })
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
