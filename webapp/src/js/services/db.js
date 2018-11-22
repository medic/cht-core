// Regex to test for characters that are invalid in db names
// Only lowercase characters (a-z), digits (0-9), and any of the characters _, $, (, ), +, -, and / are allowed.
// https://wiki.apache.org/couchdb/HTTP_database_API#Naming_and_Addressing
const DISALLOWED_CHARS = /[^a-z0-9_$()+/-]/g;
const USER_DB_SUFFIX = 'user';
const META_DB_SUFFIX = 'meta';

angular.module('inboxServices').factory('DB',
  function(
    $timeout,
    $window,
    Location,
    pouchDB,
    POUCHDB_OPTIONS,
    Session
  ) {

    'use strict';
    'ngInject';

    const cache = {};
    const isOnlineOnly = Session.isOnlineOnly();

    const getUsername = remote => {
      const username = Session.userCtx().name;
      if (!remote) {
        return username;
      }
      // escape username in case they user invalid characters
      return username.replace(DISALLOWED_CHARS, match => `(${match.charCodeAt(0)})`);
    };

    const getDbName = (remote, meta) => {
      const parts = [];
      if (remote) {
        parts.push(Location.url);
      } else {
        parts.push(Location.dbName);
      }
      if (!remote || meta) {
        parts.push(USER_DB_SUFFIX);
        parts.push(getUsername(remote));
      }
      if (meta) {
        parts.push(META_DB_SUFFIX);
      }
      return parts.join('-');
    };

    const getParams = (remote, meta) => {
      const clone = Object.assign({}, remote ? POUCHDB_OPTIONS.remote : POUCHDB_OPTIONS.local);
      if (remote && meta) {
        clone.skip_setup = false;
      }
      return clone;
    };

    const get = ({ remote=isOnlineOnly, meta=false }={}) => {
      if (!Session.userCtx()) {
        return Session.navigateToLogin();
      }
      const name = getDbName(remote, meta);
      if (!cache[name]) {
        cache[name] = pouchDB(name, getParams(remote, meta));
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
