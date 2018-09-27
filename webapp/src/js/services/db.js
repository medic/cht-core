var _ = require('underscore'),
  USER_DB_PART = 'user',
  META_DB_PART = 'meta',
  TELEMETRY_DB_PART = 'telemetry';

// Regex to test for characters that are invalid in db names
// Only lowercase characters (a-z), digits (0-9), and any of the characters _, $, (, ), +, -, and / are allowed.
// https://wiki.apache.org/couchdb/HTTP_database_API#Naming_and_Addressing
var DB_NAME_BLACKLIST = /[^a-z0-9_$()+/-]/g;

angular
  .module('inboxServices')
  .factory('DB', function(
    $window,
    Location,
    pouchDB,
    POUCHDB_OPTIONS,
    Session
  ) {
    'use strict';
    'ngInject';

    var cache = {};
    var isOnlineOnly = Session.isOnlineOnly();

    var getUsername = function(remote) {
      var username = Session.userCtx().name;
      if (!remote) {
        return username;
      }
      // escape username in case they user invalid characters
      return username.replace(DB_NAME_BLACKLIST, function(match) {
        return '(' + match.charCodeAt(0) + ')';
      });
    };

    var getDbName = function(remote, suffix) {
      var parts = [];
      if (remote) {
        parts.push(Location.url);
      } else {
        parts.push(Location.dbName);
      }
      if (!remote || suffix) {
        parts.push(USER_DB_PART);
        parts.push(getUsername(remote));
      }
      if (suffix) {
        parts.push(suffix);
      }
      return parts.join('-');
    };

    var getParams = function(remote, meta) {
      var params = {};
      if (remote) {
        if (meta) {
          params.skip_setup = false;
        }
        _.defaults(params, POUCHDB_OPTIONS.remote);
      } else {
        _.defaults(params, POUCHDB_OPTIONS.local);
      }
      return params;
    };

    var getSuffix = function(options) {
      if (options.meta) {
        return META_DB_PART;
      }
      if (options.telemetry) {
        return TELEMETRY_DB_PART;
      }
    };

    var constructor = function(options) {
      var userCtx = Session.userCtx();
      if (!userCtx) {
        return Session.navigateToLogin();
      }
      options = options || {};
      _.defaults(options, {
        remote: isOnlineOnly,
      });

      if (options.remote && options.telemetry) {
        throw new Error('We do not support remote telemetry databases');
      }

      var name = getDbName(options.remote, getSuffix(options));
      if (!cache[name]) {
        var db = pouchDB(name, getParams(options.remote, options.meta));
        cache[name] = db;
      }
      return cache[name];
    };

    constructor.medic = constructor();
    constructor.meta = constructor({ meta: true });
    constructor.telemetry = constructor({ telemetry: true, remote: false });

    if (!isOnlineOnly) {
      constructor().viewCleanup();
      constructor({ meta: true }).viewCleanup();
    }

    return constructor;
  });
