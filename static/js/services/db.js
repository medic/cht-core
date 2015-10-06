var utils = require('kujua-utils');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  inboxServices.factory('DB', [
    '$http', 'pouchDB', 'Session', 'DbNameService',
    function($http, pouchDB, Session, DbNameService) {

      var cache = {};

      var getRemoteUrl = function(name) {
        name = name || DbNameService();
        var port = location.port ? ':' + location.port : '';
        return location.protocol + '//' + location.hostname + port + '/' + name;
      };

      var isAdmin = function() {
        return utils.isUserAdmin(Session.userCtx());
      };

      var getRemote = function(name) {
        return getFromCache(getRemoteUrl(name));
      };

      var getLocal = function(name) {
        return getFromCache(name || DbNameService());
      };

      var getFromCache = function(name) {
        if (!cache[name]) {
          cache[name] = pouchDB(name, { auto_compaction: true });
        }
        return cache[name];
      };

      var get = function(name) {
        return isAdmin() ? getRemote(name) : getLocal(name);
      };

      var updateLocalDesignDoc = function(ddoc, updates, callback) {
        ddoc.app_settings = updates.app_settings;
        ddoc.views = updates.views;
        ddoc.remote_rev = updates._rev;
        getLocal()
          .put(ddoc)
          .then(callback)
          .catch(function(err) {
            console.error('Error updating local ddoc.', err);
          });
      };

      var checkLocalDesignDoc = function(rev, callback) {
        if (isAdmin()) {
          // admins access ddoc from remote db directly so don't update them
          if (callback) {
            callback();
          }
          return;
        }
        getLocal()
          .get('_design/medic')
          .then(function(localDdoc) {
            if (localDdoc.remote_rev >= rev) {
              return;
            }
            getRemote()
              .get('_design/medic')
              .then(function(remoteDdoc) {
                updateLocalDesignDoc(localDdoc, remoteDdoc, callback);
              })
              .catch(function(err) {
                console.error('Error updating ddoc. Check your connection and try again.', err);
              });
          })
          .catch(function(err) {
            console.error('Error updating ddoc. Check your connection and try again.', err);
          });
      };

      return {
        get: get,
        getRemote: getRemote,
        getRemoteUrl: getRemoteUrl,
        watchDesignDoc: function(callback) {
          // Check current ddoc revision
          $http({
            method: 'HEAD',
            url: getRemoteUrl() + '/_design/medic'
          }).success(function(data, status, headers) {
            var rev = headers().etag.replace(/"/g, '');
            checkLocalDesignDoc(rev);
          });

          // Listen for remote ddoc changes
          getRemote()
            .changes({ live: true, since: 'now', doc_ids: [ '_design/medic' ] })
            .on('change', function(change) {
              checkLocalDesignDoc(change.changes[0].rev, callback);
            });
        }
      };
    }
  ]);

}());