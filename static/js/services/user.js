var utils = require('kujua-utils');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');
  

  inboxServices.factory('UserDistrict', ['$q', 'db', 'UserCtxService',
    function($q, db, UserCtxService) {
      return function() {
        var deferred = $q.defer();
        utils.checkDistrictConstraint(UserCtxService(), db, function(err, fac) {
          deferred.resolve({ error: err, district: fac });
        });
        return deferred.promise;
      };
    }
  ]);

  inboxServices.factory('User', ['$resource', 'UserCtxService',
    function($resource, UserCtxService) {
      return $resource('/_users/org.couchdb.user%3A' + UserCtxService().name, {}, {
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
      return function(updates) {
        User.query(function(user) {
          db.use('_users').saveDoc(_.extend(user, updates), function(err) {
            if (err) {
              return console.log(err);
            }
            $cacheFactory.get('$http')
              .remove('/_users/org.couchdb.user%3A' + UserCtxService().name);
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