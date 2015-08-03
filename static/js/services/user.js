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

  var getUserUrl = function(id) {
    return '/_users/' + encodeURIComponent(id);
  };

  var getUser = function(HttpWrapper, id, callback) {
    HttpWrapper.get(getUserUrl(id), { cache: true, targetScope: 'root' })
      .success(function(data) {
        callback(null, data);
      })
      .error(callback);
  };

  inboxServices.factory('User', ['HttpWrapper', 'UserCtxService',
    function(HttpWrapper, UserCtxService) {
      return function(callback) {
        getUser(HttpWrapper, 'org.couchdb.user:' + UserCtxService().name, callback);
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
    cache.remove(getUserUrl(id));
    cache.remove('/_users/_all_docs?include_docs=true');
    cache.remove('/_config/admins');
  };

  inboxServices.factory('UpdateUser', ['$log', '$cacheFactory', 'HttpWrapper', 'DB', 'Admins',
    function($log, $cacheFactory, HttpWrapper, DB, Admins) {

      var createId = function(name) {
        return 'org.couchdb.user:' + name;
      };

      var getOrCreateUser = function(id, name, callback) {
        if (id) {
          getUser(HttpWrapper, id, callback);
        } else {
          callback(null, {
            _id: createId(name),
            type: 'user'
          });
        }
      };

      var getOrCreateUserSettings = function(id, name, callback) {
        if (id) {
          DB.get()
            .get(id)
            .then(function(response) {
              callback(null, response);
            })
            .catch(callback);
        } else {
          callback(null, {
            _id: createId(name),
            type: 'user-settings'
          });
        }
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

      var updateUser = function(id, updates, callback) {
        if (!updates) {
          // only updating settings
          return callback();
        }
        getOrCreateUser(id, updates.name, function(err, user) {
          if (err) {
            return callback(err);
          }
          $log.debug('user being updated', user);
          $log.debug('updates', updates);
          var updated = _.extend(user, updates);
          updatePassword(updated, function(err) {
            if (err) {
              return callback(err);
            }
            HttpWrapper.put(getUserUrl(user._id), updated)
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

      var updateSettings = function(id, updates, callback) {
        if (!updates) {
          // only updating user
          return callback();
        }
        getOrCreateUserSettings(id, updates.name, function(err, settings) {
          if (err) {
            return callback(err);
          }
          var updated = _.extend(settings, updates);
          DB.get()
            .put(updated)
            .then(function() {
              callback();
            })
            .catch(callback);
        });
      };

      return function(id, settingUpdates, userUpdates, callback) {
        if (!callback) {
          callback = userUpdates;
          userUpdates = null;
        }
        if (!id && !userUpdates) {
          return callback(new Error('Cannot update user settings without user'));
        }
        updateUser(id, userUpdates, function(err) {
          if (err) {
            return callback(err);
          }
          updateSettings(id, settingUpdates, callback);
        });
      };
    }
  ]);

  inboxServices.factory('DeleteUser', ['$cacheFactory', 'HttpWrapper', 'DeleteDoc',
    function($cacheFactory, HttpWrapper, DeleteDoc) {

      var deleteUser = function(id, callback) {
        var url = getUserUrl(id);
        HttpWrapper.get(url)
          .success(function(user) {
            user._deleted = true;
            HttpWrapper.put(url, user)
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