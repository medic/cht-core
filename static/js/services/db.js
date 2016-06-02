(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  inboxServices.factory('DB',
    function(
      $window,
      E2ETESTING,
      Location,
      pouchDB,
      Session,
      WebWorker
    ) {

      'ngInject';

      var cache = {};

      var pouchWorker = WebWorker(require('worker-pouch/workerified'));

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
          adapter: 'worker',
          worker: function () {
            return pouchWorker;
          },
          auto_compaction: true
        };
        return getFromCache(name, options);
      };

      var getFromCache = function(name, options) {
        if (!cache[name]) {
          cache[name] = pouchDB(name, options);
        }
        return cache[name];
      };

      var get = function() {
        return Session.isAdmin() ? getRemote() : getLocal();
      };

      return {
        get: get,
        getRemote: getRemote
      };
    }
  );

}());
