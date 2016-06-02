var utils = require('kujua-utils'),
    async = require('async');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  inboxServices.factory('WatchDesignDoc',
    function(
      $http,
      $log,
      $timeout,
      CleanETag,
      DB,
      E2ETESTING,
      Location,
      Session
    ) {

      'ngInject';

      var isAdmin = function() {
        return utils.isUserAdmin(Session.userCtx());
      };

      var updateLocalDesignDoc = function(ddoc, updates, callback) {
        ddoc.app_settings = updates.app_settings;
        ddoc.views = updates.views;
        ddoc.remote_rev = updates._rev;
        DB.get()
          .put(ddoc)
          .then(callback)
          .catch(function(err) {
            $log.error('Error updating local ddoc.', err);
          });
      };

      var checkLocalDesignDoc = function(rev, callback) {
        DB.get()
          .get('_design/medic')
          .then(function(localDdoc) {
            if (localDdoc.remote_rev === rev) {
              return;
            }
            return DB.getRemote()
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

      return function(callback) {
        if (!E2ETESTING) {
          async.forever(function(next) {
            if (!isAdmin()) {
              // check current ddoc revision vs local pouch version
              $http({
                method: 'HEAD',
                url: Location.url + '/_design/medic'
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
            DB.getRemote()
              .changes({
                live: true,
                since: 'now',
                doc_ids: [ '_design/medic' ]
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
    }
  );

}());
