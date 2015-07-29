var _ = require('underscore'),
    utils = require('kujua-utils'),
    async = require('async');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');
  
  inboxServices.factory('UserDistrict', ['DB', 'User', 'UserCtxService',
    function(DB, User, UserCtxService) {
      return function(callback) {
        var userCtx = UserCtxService();
        if (!userCtx.name) {
          return callback(new Error('Not logged in'));
        }
        if (utils.isUserAdmin(userCtx)) {
          return callback();
        }
        if (!utils.isUserDistrictAdmin(userCtx)) {
          return callback(new Error('The administrator needs to give you additional privileges to use this site.'));
        }
        User(function(err, user) {
          if (!user.facility_id) {
            return callback(new Error('No district assigned to district admin.'));
          }
          // ensure the facility exists
          DB.get()
            .get(user.facility_id)
            .then(function() {
              callback(null, user.facility_id);
            })
            .catch(callback);
        });
      };
    }
  ]);

  var getUser = function(HttpWrapper, id, callback) {
    HttpWrapper.get('/_users/' + id, { cache: true, targetScope: 'root' })
      .success(function(data) {
        callback(null, data);
      })
      .error(callback);
  };

  inboxServices.factory('User', ['HttpWrapper', 'UserCtxService',
    function(HttpWrapper, UserCtxService) {
      return function(callback) {
        getUser(HttpWrapper, 'org.couchdb.user%3A' + UserCtxService().name, callback);
      };
    }
  ]);

  inboxServices.factory('UserSettings', ['DB', 'UserCtxService',
    function(DB, UserCtxService) {
      return function(callback) {
        DB.get()
          .get('org.couchdb.user:' + UserCtxService().name)
          .then(function(user) {
            callback(null, user);
          })
          .catch(callback);
      };
    }
  ]);

  inboxServices.factory('Admins', ['HttpWrapper',
    function(HttpWrapper) {
      return function(callback) {
        HttpWrapper.get('/_config/admins', { cache: true })
          .success(function(data) {
            callback(null, data);
          })
          .error(function(data) {
            callback(new Error(data));
          });
      };
    }
  ]);

  inboxServices.factory('Users', ['HttpWrapper', 'Facility', 'Admins', 'DbView',
    function(HttpWrapper, Facility, Admins, DbView) {

      var getType = function(user, admins) {
        if (user.doc.roles && user.doc.roles.length) {
          return user.doc.roles[0];
        }
        return admins[user.doc.name] ? 'admin' : 'unknown';
      };

      var getFacility = function(user, facilities) {
        return _.findWhere(facilities, { _id: user.doc.facility_id });
      };

      var getSettings = function(user, settings) {
        return _.findWhere(settings, { _id: user.id });
      };

      var mapUsers = function(users, settings, facilities, admins) {
        var filtered = _.filter(users, function(user) {
          return user.id.indexOf('org.couchdb.user:') === 0;
        });
        return _.map(filtered, function(user) {
          var setting = getSettings(user, settings) || {};
          return {
            id: user.id,
            rev: user.doc._rev,
            name: user.doc.name,
            fullname: setting.fullname,
            email: setting.email,
            phone: setting.phone,
            facility: getFacility(user, facilities),
            type: getType(user, admins),
            language: { code: setting.language }
          };
        });
      };

      var getAllUsers = function(callback) {
        HttpWrapper
          .get('/_users/_all_docs', { cache: true, params: { include_docs: true } })
          .success(function(data) {
            callback(null, data);
          })
          .error(callback);
      };

      var getAllUserSettings = function(callback) {
        DbView(
          'doc_by_type',
          { params: { include_docs: true, key: ['user-settings'] } },
          callback
        );
      };

      return function(callback) {
        async.parallel(
          [ getAllUsers, getAllUserSettings, Facility, Admins ],
          function(err, results) {
            if (err) {
              return callback(err);
            }
            callback(null, mapUsers(results[0].rows, results[1][0], results[2], results[3]));
          }
        );
      };
    }
  ]);

  var removeCacheEntry = function($cacheFactory, id) {
    var cache = $cacheFactory.get('$http');
    cache.remove('/_users/' + encodeURIComponent(id));
    cache.remove('/_users/_all_docs?include_docs=true');
    cache.remove('/_config/admins');
  };

  // TODO update user settings too
  inboxServices.factory('UpdateUser', ['HttpWrapper', '$cacheFactory', 'Admins',
    function(HttpWrapper, $cacheFactory, Admins) {

      var getOrCreateUser = function(id, updates, callback) {
        if (id) {
          return getUser(HttpWrapper, id, callback);
        }
        callback(null, {
          _id: 'org.couchdb.user:' + updates.name,
          type: 'user'
        });
      };

      var updatePassword = function(updated, callback) {
        if (!updated.password) {
          // password not changed, do nothing
          return callback();
        }
        updated.derived_key = undefined;
        updated.salt = undefined;
        Admins(function(err, admins) {
          if (err) {
            return callback(err);
          }
          if (!admins[updated.name]) {
            // not an admin so admin password change not required
            return callback();
          }
          HttpWrapper.put('/_config/admins/' + updated.name, '"' + updated.password + '"')
            .success(function() {
              callback();
            })
            .error(function(data) {
              callback(new Error(data));
            });
        });
      };

      return function(id, updates, callback) {
        getOrCreateUser(id, updates, function(err, user) {
          if (err) {
            return callback(err);
          }
          var updated = _.extend(user, updates);
          updatePassword(updated, function(err) {
            if (err) {
              return callback(err);
            }
            HttpWrapper.put('/_users/' + user._id, updated)
              .success(function() {
                removeCacheEntry($cacheFactory, user._id);
                callback(null, updated);
              })
              .error(function(data) {
                callback(new Error(data));
              });
          });
        });
      };
    }
  ]);

  // TODO delete user settings too
  inboxServices.factory('DeleteUser', ['HttpWrapper', '$cacheFactory',
    function(HttpWrapper, $cacheFactory) {
      return function(user, callback) {
        var url = '/_users/' + user.id;
        HttpWrapper.get(url)
          .success(function(user) {
            user._deleted = true;
            HttpWrapper.put(url, user)
              .success(function() {
                removeCacheEntry($cacheFactory, user._id);
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
    }
  ]);

}());