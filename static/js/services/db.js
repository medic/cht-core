var _ = require('underscore');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  inboxServices.factory('DB',
    function(
      $window,
      Location,
      pouchDB,
      POUCHDB_OPTIONS,
      Session,
      WebWorker
    ) {

      'ngInject';

      var cache = {};

      var pouchWorker = WebWorker(require('worker-pouch/workerified'));

      $window.PouchDB.adapter('worker', require('worker-pouch/client'));

      var getRemote = function() {
        return getFromCache(Location.url, POUCHDB_OPTIONS.remote);
      };

      var getLocal = function() {
        var userCtx = Session.userCtx();
        if (!userCtx) {
          return Session.navigateToLogin();
        }
        var name = Location.dbName + '-user-' + userCtx.name;
        var options = {
          adapter: 'worker',
          worker: function () {
            return pouchWorker;
          }
        };
        _.defaults(options, POUCHDB_OPTIONS.local);
        return getFromCache(name, options);
      };

      var getFromCache = function(name, options) {
        if (!cache[name]) {
          var db = pouchDB(name, options);
          cache[name] = db;
        }
        return cache[name];
      };

      if (!Session.isAdmin()) {
        getLocal().viewCleanup();
      }

      return function(options) {
        if ((options && options.remote) || Session.isAdmin()) {
          return getRemote();
        }
        return getLocal();
      };
    }
  );

}());
