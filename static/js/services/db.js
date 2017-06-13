var _ = require('underscore');

angular.module('inboxServices').factory('DB',
  function(
    $window,
    Location,
    pouchDB,
    POUCHDB_OPTIONS,
    Session,
    WebWorker
  ) {

    'use strict';
    'ngInject';

    var cache = {};

    var pouchWorker = WebWorker(require('worker-pouch/workerified'));

    $window.PouchDB.adapter('worker', require('worker-pouch/client'));

    // TODO clean this up 
    var getDbName = function(remote, meta) {
      var userCtx = Session.userCtx();
      if (remote) {
        if (meta) {
          return Location.url + '-user-' + userCtx.name + '-meta';
        } else {
          return Location.url;
        }
      } else {
        if (meta) {
          return Location.dbName + '-user-' + userCtx.name + '-meta';
        } else {
          return Location.dbName + '-user-' + userCtx.name;
        }
      }
    };

    var getParams = function(remote, meta) {
      var params = { };
      if (remote) {
        if (meta) {
          params.skip_setup = false;
        }
        _.defaults(params, POUCHDB_OPTIONS.remote);
      } else {
        params.adapter = 'worker';
        params.worker = function () {
          return pouchWorker;
        };
        _.defaults(params, POUCHDB_OPTIONS.local);
      }
      return params;
    };

    var get = function(options) {
      var userCtx = Session.userCtx();
      if (!userCtx) {
        return Session.navigateToLogin();
      }
      options = options || {};
      _.defaults(options, {
        remote: Session.isAdmin(),
        meta: false
      });
      var name = getDbName(options.remote, options.meta);
      if (!cache[name]) {
        var db = pouchDB(name, getParams(options.remote, options.meta));
        cache[name] = db;
      }
      return cache[name];
    };

    if (!Session.isAdmin()) {
      get({ local: true }).viewCleanup();
      get({ local: true, meta: true }).viewCleanup();
    }

    return get;
  }
);
