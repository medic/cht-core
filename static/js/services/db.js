var utils = require('kujua-utils'),
    async = require('async');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  inboxServices.factory('DB',
    function(
      $http,
      $log,
      $timeout,
      $window,
      CleanETag,
      DbNameService,
      E2ETESTING,
      pouchDB,
      Session
    ) {

      'ngInject';

      var cache = {};

      // var consolePolyfill = function(global) {
      //   var replace = function(con, props, replacement) {
      //     props = props.split(',');
      //     var prop = props.pop();
      //     while (prop) {
      //       if (!con[prop]) {
      //         con[prop] = replacement;
      //       }
      //       prop = props.pop();
      //     }
      //   };
      //   global.console = global.console || {};
      //   var PROPERTIES = 'memory';
      //   var METHODS = 'assert,clear,count,debug,dir,dirxml,error,exception,group,' +
      //      'groupCollapsed,groupEnd,info,log,markTimeline,profile,profiles,profileEnd,' +
      //      'show,table,time,timeEnd,timeline,timelineEnd,timeStamp,trace,warn';
      //   replace(global.console, PROPERTIES, {});
      //   replace(global.console, METHODS, function() {});
      // };

      var createWorker = function(code) {
        /* global webkitURL */
        code = [
          // '(' + consolePolyfill.toString() + ')(typeof window === \'undefined\' ? this : window);',
          code
        ];

        var createBlob = require('pouchdb-binary-util').createBlob;
        var URLCompat = typeof URL !== 'undefined' ? URL : webkitURL;

        function makeBlobURI(script) {
          var blob = createBlob([script], {type: 'text/javascript'});
          return URLCompat.createObjectURL(blob);
        }

        var blob = createBlob(code, {type: 'text/javascript'});
        return new Worker(makeBlobURI(blob));
      };

      // TODO angular service to wrap it with the necessary goodies
      // TODO test on alpha.dev - should have console fail!
      // TODO add console polyfill to service
      // TODO test on alpha.dev - should not have console fail!
      var pouchWorker = createWorker(require('worker-pouch/workerified'));

      $window.PouchDB.adapter('worker', require('worker-pouch/client'));

      var getRemoteUrl = function(name) {
        name = name || DbNameService();
        var loc = $window.location;
        var port = loc.port ? ':' + loc.port : '';
        return loc.protocol + '//' + loc.hostname + port + '/' + name;
      };

      var isAdmin = function() {
        return utils.isUserAdmin(Session.userCtx());
      };

      var getRemote = function(name) {
        var options = {
          skip_setup: true,
          ajax: { timeout: 30000 }
        };
        return getFromCache(getRemoteUrl(name), options);
      };

      var getLocal = function(name) {
        var userCtx = Session.userCtx();
        if (!userCtx) {
          return Session.navigateToLogin();
        }
        name = (name || DbNameService()) + '-user-' + userCtx.name;
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
            if (localDdoc.remote_rev === rev) {
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
                var rev = CleanETag(headers().etag);
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
        watchDesignDoc: watchDesignDoc
      };
    }
  );

}());
