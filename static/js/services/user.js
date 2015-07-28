var _ = require('underscore'),
    utils = require('kujua-utils');

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

  inboxServices.factory('User', ['HttpWrapper', 'UserCtxService',
    function(HttpWrapper, UserCtxService) {
      return function(callback) {
        HttpWrapper
          .get(
            '/_users/org.couchdb.user%3A' + UserCtxService().name,
            { cache: true, targetScope: 'root' }
          )
          .success(function(data) {
            callback(null, data);
          })
          .error(function(data) {
            callback(new Error(data));
          });
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

  var getType = function(user, admins) {
    if (user.doc.roles && user.doc.roles.length) {
      return user.doc.roles[0];
    }
    return admins[user.doc.name] ? 'admin' : 'unknown';
  };

  var getFacility = function(user, facilities) {
    return _.findWhere(facilities, { _id: user.doc.facility_id });
  };

  var mapUsers = function(users, facilities, admins) {
    var filtered = _.filter(users, function(user) {
      return user.id.indexOf('org.couchdb.user:') === 0;
    });
    return _.map(filtered, function(user) {
      return {
        id: user.id,
        rev: user.doc._rev,
        name: user.doc.name,
        fullname: user.doc.fullname,
        email: user.doc.email,
        phone: user.doc.phone,
        facility: getFacility(user, facilities),
        type: getType(user, admins),
        language: { code: user.doc.language }
      };
    });
  };

  inboxServices.factory('Users', ['HttpWrapper', 'Facility', 'Admins',
    function(HttpWrapper, Facility, Admins) {
      return function(callback) {
        HttpWrapper.get('/_users/_all_docs?include_docs=true', { cache: true })
          .success(function(data) {
            Facility(function(err, facilities) {
              if (err) {
                return callback(err);
              }
              Admins(function(err, admins) {
                if (err) {
                  return callback(err);
                }
                callback(null, mapUsers(data.rows, facilities, admins));
              });
            });
          })
          .error(function(data) {
            callback(new Error(data));
          });
      };
    }
  ]);

  var getUser = function(HttpWrapper, id, updates, callback) {
    if (id) {
      HttpWrapper.get('/_users/' + id)
        .success(function(data) {
          callback(null, id, _.extend(data, updates));
        })
        .error(function(data) {
          callback(new Error(data));
        });
    } else {
      id = 'org.couchdb.user:' + updates.name;
      updates._id = id;
      updates.type = 'user';
      callback(null, 'org.couchdb.user:' + updates.name, updates);
    }
  };

  var updatePassword = function(HttpWrapper, Admins, updated, callback) {
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

  var removeCacheEntry = function($cacheFactory, id) {
    var cache = $cacheFactory.get('$http');
    cache.remove('/_users/' + encodeURIComponent(id));
    cache.remove('/_users/_all_docs?include_docs=true');
    cache.remove('/_config/admins');
  };

  inboxServices.factory('UpdateUser', ['HttpWrapper', '$cacheFactory', 'Admins',
    function(HttpWrapper, $cacheFactory, Admins) {
      return function(id, updates, callback) {
        getUser(HttpWrapper, id, updates, function(err, id, updated) {
          if (err) {
            return callback(err);
          }
          updatePassword(HttpWrapper, Admins, updated, function(err) {
            if (err) {
              return callback(err);
            }
            HttpWrapper.put('/_users/' + id, updated)
              .success(function() {
                removeCacheEntry($cacheFactory, id);
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