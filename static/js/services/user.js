var _ = require('underscore'),
    utils = require('kujua-utils');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');
  
  inboxServices.factory('UserDistrict', ['db', 'UserCtxService',
    function(db, UserCtxService) {
      return function(callback) {
        var userCtx = UserCtxService();
        if (!userCtx.name) {
          return callback('Not logged in');
        }
        if (utils.isUserAdmin(userCtx)) {
          return callback();
        }
        if (utils.isUserDistrictAdmin(userCtx)) {
          return utils.checkDistrictConstraint(userCtx, db, callback);
        }
        callback('The administrator needs to give you additional privileges to use this site.');
      };
    }
  ]);

  var getUserResourceUrl = function(userCtx) {
    return '/_users/org.couchdb.user%3A' + userCtx.name;
  };

  inboxServices.factory('User', ['$resource', 'UserCtxService',
    function($resource, UserCtxService) {
      return $resource(getUserResourceUrl(UserCtxService()), {}, {
        query: {
          method: 'GET',
          isArray: false,
          cache: true
        }
      });
    }
  ]);

  inboxServices.factory('UpdateUser', ['$cacheFactory', 'db', 'User', 'UserCtxService',
    function($cacheFactory, db, User, UserCtxService) {
      return function(updates, callback) {
        User.query(function(user) {
          var updated = _.extend(user, updates);
          db.use('_users').saveDoc(updated, function(err) {
            var cachename = getUserResourceUrl(UserCtxService());
            $cacheFactory.get('$http').remove(cachename);
            callback(err, updated);
          });
        });
      };
    }
  ]);

  inboxServices.factory('Language', ['$q', 'User', 'Settings',
    function($q, User, Settings) {
      return function() {
        var deferred = $q.defer();
        User.query(function(res) {
          if (res && res.language) {
            deferred.resolve(res.language);
          } else {
            Settings.query(function(res) {
              deferred.resolve((res.settings && res.settings.locale) || 'en');
            });
          }
        });
        return deferred.promise;
      };
    }
  ]);

}());