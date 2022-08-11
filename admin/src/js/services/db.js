// Regex to test for characters that are invalid in db names
// Only lowercase characters (a-z), digits (0-9), and any of the characters _, $, (, ), +, -, and / are allowed.
// https://wiki.apache.org/couchdb/HTTP_database_API#Naming_and_Addressing
const DISALLOWED_CHARS = /[^a-z0-9_$()+/-]/g;
const USER_DB_SUFFIX = 'user';
const META_DB_SUFFIX = 'meta';
const USERS_DB_SUFFIX = 'users';
const MEDIC_LOGS_DB_SUFFIX = 'logs';

angular.module('inboxServices').factory('DB',
  function(
    $timeout,
    Location,
    POUCHDB_OPTIONS,
    Session,
    pouchDB
  ) {

    'use strict';
    'ngInject';

    const cache = {};
    const isOnlineOnly = Session.isOnlineOnly();

    const getUsername = remote => {
      Session.checkCurrentSession();
      const username = Session.userCtx().name;
      if (!remote) {
        return username;
      }
      // escape username in case they user invalid characters
      return username.replace(DISALLOWED_CHARS, match => `(${match.charCodeAt(0)})`);
    };

    const getDbName = (remote, meta, usersMeta, logsDB) => {
      const parts = [];
      if (remote) {
        parts.push(Location.url);
      } else {
        parts.push(Location.dbName);
      }

      if (logsDB) {
        parts.push(MEDIC_LOGS_DB_SUFFIX);
      }

      if ((!remote || meta) && !usersMeta && !logsDB) {
        parts.push(USER_DB_SUFFIX);
        parts.push(getUsername(remote));
      } else if (usersMeta) {
        parts.push(USERS_DB_SUFFIX);
      }
      if (meta || usersMeta) {
        parts.push(META_DB_SUFFIX);
      }
      return parts.join('-');
    };

    const getParams = (remote, meta, usersMeta) => {
      const clone = Object.assign({}, remote ? POUCHDB_OPTIONS.remote : POUCHDB_OPTIONS.local);
      if (remote && meta) {
        // Don't create user DBs remotely, we do this ourselves in /api/services/user-db:create,
        // which is called in routing when a user tries to access the DB
        clone.skip_setup = false;
      }
      if (remote && usersMeta) {
        clone.skip_setup = false;
      }
      return clone;
    };

    const get = ({ remote=isOnlineOnly, meta=false, usersMeta=false, logsDB=false }={}) => {
      const name = getDbName(remote, meta, usersMeta, logsDB);
      if (!cache[name]) {
        cache[name] = pouchDB(name, getParams(remote, meta, usersMeta));
      }
      return cache[name];
    };

    if (!isOnlineOnly) {
      // delay the cleanup so it's out of the main startup sequence
      $timeout(() => {
        get().viewCleanup();
        get({ meta: true }).viewCleanup();
      }, 1000);
    }

    return get;
  }
);
