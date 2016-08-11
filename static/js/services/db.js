(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  inboxServices.factory('DB',
    function(
      $window,
      Location,
      pouchDB,
      Session
    ) {

      'ngInject';

      var cache = {};

      $window.PouchDB.adapter('worker', require('worker-pouch/client'));

      var getRemote = function() {
        var options = {
          skip_setup: true,
          ajax: { timeout: 30000 }
        };
        return getFromCache(Location.url, options);
      };

      var getLocal = function() {
        var userCtx = Session.userCtx();
        if (!userCtx) {
          return Session.navigateToLogin();
        }
        var name = Location.dbName + '-user-' + userCtx.name;
        var options = {
        /*
          // Temporary : remove web worker for testing firefox persistent storage #2623
          adapter: 'worker',
          worker: function () {
            return pouchWorker;
          },*/
          auto_compaction: true,
          storage: 'persistent'
        };
        return getFromCache(name, options);
      };

      var getFromCache = function(name, options) {
        if (!cache[name]) {
          cache[name] = pouchDB(name, options);
        }
        return cache[name];
      };

      return function(options) {
        if ((options && options.remote) || Session.isAdmin()) {
          return getRemote();
        }
        return getLocal();
      };
    }
  );

}());
