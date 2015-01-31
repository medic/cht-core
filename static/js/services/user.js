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

  inboxServices.factory('User', ['$http', 'UserCtxService',
    function($http, UserCtxService) {
      return function(callback) {
        $http.get(getUserResourceUrl(UserCtxService()), { cache: true })
          .success(function(data) {
            callback(null, data);
          })
          .error(function(data, status) {
            callback('Error getting user: ' + status);
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
          .error(function(data, status) {
            callback('Error getting admins: ' + status);
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
    var facility = _.findWhere(facilities, { id: user.doc.facility_id });
    return facility && facility.doc;
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

  inboxServices.factory('Users', ['$http', 'Facilities', 'Admins',
    function($http, Facilities, Admins) {
      return function(callback) {
        $http.get('/_users/_all_docs?include_docs=true', { cache: true })
          .success(function(data) {
            Facilities(function(err, facilities) {
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
          .error(function(data, status) {
            callback('Error getting users: ' + status);
          });
      };
    }
  ]);

  var getUser = function($http, id, updates, callback) {
    if (id) {
      $http.get('/_users/' + id)
        .success(function(data) {
          callback(null, id, _.extend(data, updates));
        })
        .error(function(data, status) {
          callback('Error getting user: ' + status);
        });
    } else {
      id = 'org.couchdb.user:' + updates.name;
      updates._id = id;
      updates.type = 'user';
      callback(null, 'org.couchdb.user:' + updates.name, updates);
    }
  };

  var clearCache = function($cacheFactory, userId) {
    var cache = $cacheFactory.get('$http');
    if (userId) {
      cache.remove('/_users/' + userId);
    }
    cache.remove('/_users/_all_docs?include_docs=true');
  };

  var updatePassword = function($http, Admins, updated, callback) {
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
      $http.put('/_config/admins/' + updated.name, '"' + updated.password + '"')
        .success(function() {
          callback();
        })
        .error(function(data, status) {
          callback('Error updating admin password: ' + status);
        });
    });
  };

  inboxServices.factory('UpdateUser', ['$http', '$cacheFactory', 'Admins',
    function($http, $cacheFactory, Admins) {
      return function(id, updates, callback) {
        getUser($http, id, updates, function(err, id, updated) {
          if (err) {
            return callback(err);
          }
          updatePassword($http, Admins, updated, function(err) {
            if (err) {
              return callback(err);
            }
            $http.put('/_users/' + id, JSON.stringify(updated))
              .success(function() {
                clearCache($cacheFactory, id);
                callback(null, updated);
              })
              .error(function(data, status) {
                return callback('Error updating user: ' + status);
              });
          });
        });
      };
    }
  ]);

  inboxServices.factory('DeleteUser', ['$http', '$cacheFactory',
    function($http, $cacheFactory) {
      return function(user, callback) {
        $http.delete('/_users/' + user.id + '?rev=' + user.rev)
          .success(function() {
            clearCache($cacheFactory, user.id);
            callback();
          })
          .error(function(data, status) {
            callback('Error deleting user: ' + status);
          });
      };
    }
  ]);

  var fetchLocale = function(User, Settings, callback) {
    User(function(err, res) {
      if (err) {
        return callback(err);
      }
      if (res && res.language) {
        return callback(null, res.language);
      }
      Settings(function(err, res) {
        if (err) {
          return callback(err);
        }
        callback(null, res.locale || 'en');
      });
    });
  };

  inboxServices.factory('Language', ['ipCookie', 'User', 'Settings',
    function(ipCookie, User, Settings) {
      var cookieKey = 'locale';
      return function(callback) {
        var cookieVal = ipCookie(cookieKey);
        if (cookieVal) {
          return callback(null, cookieVal);
        }
        fetchLocale(User, Settings, function(err, locale) {
          if (err) {
            return callback(err);
          }
          ipCookie(cookieKey, locale, { expires: 365, path: '/' });
          callback(null, locale);
        });
      };
    }
  ]);

}());