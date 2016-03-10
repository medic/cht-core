var utils = require('kujua-utils'),
    async = require('async'),
    etagRegex = /(?:^W\/)|['"]/g;

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  inboxServices.factory('DB', [
    '$http', '$timeout', '$log', '$window', 'pouchDB', 'Session', 'DbNameService', 'E2ETESTING',
    function($http, $timeout, $log, $window, pouchDB, Session, DbNameService, E2ETESTING) {

      var cache = {};

      $window.PouchDB.adapter('worker', require('worker-pouch'));

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
        var userCtx = Session.userCtx();
        if (!userCtx) {
          return Session.navigateToLogin();
        }
        return getFromCache((name || DbNameService()) + '-user-' + userCtx.name);
      };

      var getFromCache = function(name) {
        if (!cache[name]) {
          cache[name] = pouchDB(name, {
            auto_compaction: true,
            adapter: 'worker'
          });
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
            $log.error('Error updating local ddoc.', err);
          });
      };

      var checkLocalDesignDoc = function(rev, callback) {
        getLocal()
          .get('_design/medic')
          .then(function(localDdoc) {
            if (localDdoc.remote_rev >= rev) {
              return;
            }
            return getRemote()
              .get('_design/medic')
              .then(function(remoteDdoc) {
                updateLocalDesignDoc(localDdoc, remoteDdoc, callback);
              });
          })
          .catch(function(err) {
            if (err.status === 401) {
              Session.navigateToLogin();
            } else {
              $log.error('Error updating ddoc. Check your connection and try again.', err);
            }
          });
      };

      var watchDesignDoc = function(callback) {
        if (!E2ETESTING) {
          async.forever(function(next) {
            if (!isAdmin()) {
              // check current ddoc revision vs local pouch version
              $http({
                method: 'HEAD',
                url: getRemoteUrl() + '/_design/medic'
              }).success(function(data, status, headers) {
                var rev = headers().etag.replace(etagRegex, '');
                checkLocalDesignDoc(rev, callback);
              }).catch(function(err) {
                if (err.status === 401) {
                  Session.navigateToLogin();
                } else {
                  $log.error('Error watching HEAD of ddoc', err);
                }
              });
            }

            // Listen for remote ddoc changes
            getRemote()
              .changes({
                live: true,
                since: 'now',
                doc_ids: [ '_design/medic' ],
                timeout: 1000 * 60 * 60
              })
              .on('change', function(change) {
                if (isAdmin()) {
                  // admins access ddoc from remote db directly so
                  // no need to check local ddoc
                  return callback();
                }
                checkLocalDesignDoc(change.changes[0].rev, callback);
              })
              .on('error', function(err) {
                $log.debug('Error watching for changes on the design doc', err);
                $timeout(next, 10000);
              });
          });
        }
      };


      return {
        get: get,
        getRemote: getRemote,
        getRemoteUrl: getRemoteUrl,
        watchDesignDoc: watchDesignDoc
      };
    }
  ]);

}());
