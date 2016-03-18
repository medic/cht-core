var _ = require('underscore'),
    utils = require('kujua-utils'),
    async = require('async');

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

  inboxServices.factory('Users', ['$http', 'Facility', 'Admins', 'DbView',
    function($http, Facility, Admins, DbView) {

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
            language: { code: setting.language },
            contact_id: setting.contact_id
          };
        });
      };

      var getAllUsers = function(callback) {
        $http
          .get('/_users/_all_docs', { cache: true, params: { include_docs: true } })
          .success(function(data) {
            callback(null, data);
          })
          .error(callback);
      };

      var getAllUserSettings = function(callback) {
        var options = { params: { include_docs: true, key: ['user-settings'] } };
        DbView('doc_by_type', options)
          .then(function(data) {
            callback(null, data.results);
          })
          .catch(callback);
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

  var getUserUrl = function(id) {
    return '/_users/' + encodeURIComponent(id);
  };

  var removeCacheEntry = function($cacheFactory, id) {
    var cache = $cacheFactory.get('$http');
    cache.remove(getUserUrl(id));
    cache.remove('/_users/_all_docs?include_docs=true');
    cache.remove('/_config/admins');
  };

  inboxServices.factory('UpdateUser', ['$log', '$cacheFactory', '$http', 'DB', 'Admins',
    function($log, $cacheFactory, $http, DB, Admins) {

      var createId = function(name) {
        return 'org.couchdb.user:' + name;
      };

      var getOrCreateUser = function(id, name, callback) {
        if (id) {
          $http.get(getUserUrl(id), { cache: true, targetScope: 'root' })
            .success(function(data) {
              callback(null, data);
            })
            .error(callback);
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
        Admins(function(err, admins) {
          if (err) {
            if (err.error === 'unauthorized') {
              // not an admin
              return callback();
            }
            return callback(err);
          }
          if (!admins[updated.name]) {
            // not an admin so admin password change not required
            return callback();
          }
          $http.put('/_config/admins/' + updated.name, '"' + updated.password + '"')
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
          $log.debug('user being updated', user._id);
          var updated = _.extend(user, updates);
          if (updated.password) {
            updated.derived_key = undefined;
            updated.salt = undefined;
          }
          $http
            .put(getUserUrl(user._id), updated)
            .success(function() {
              updatePassword(updated, function(err) {
                removeCacheEntry($cacheFactory, user._id);
                callback(err, updated);
              });
            })
            .error(callback);
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
