var _ = require('underscore'),
    utils = require('kujua-utils');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  var backOffFunction = function(prev) {
    if (prev <= 0) {
      // first run, backoff 1 second
      return 1000;
    }
    // double the backoff, maxing out at 1 minute
    return Math.min(prev * 2, 60000);
  };

  var authenticationIssue = function(errors) {
    return _.find(errors, function(error) { return error.status === 401;});
  };

  inboxServices.factory('DBSync', [
    '$log', 'DB', 'UserDistrict', 'Session', 'Settings', '$q',
    function($log, DB, UserDistrict, Session, Settings, $q) {

      var getDataUsage = function() {
        if (window.medicmobile_android && window.medicmobile_android.getDataUsage) {
          return JSON.parse(window.medicmobile_android.getDataUsage());
        }
      };

      var dbSyncStartTime = Date.now();
      var dbSyncStartData = getDataUsage();
      var replicateTiming = {};

      var replicate = function(direction, options) {
        options = options || {};
        _.defaults(options, {
          live: true,
          retry: true,
          timeout: false,
          back_off_function: backOffFunction
        });
        var fn = DB.get().replicate[direction];

        replicateTiming[direction] = {};
        replicateTiming[direction].start =
          replicateTiming[direction].last = Date.now();

        return fn(DB.getRemote(), options)
          .on('denied', function(err) {
            // In theory this could be caused by 401s
            // TODO: work out what `err` looks like and navigate to login
            // when we detect it's a 401
            $log.error('Denied replicating ' + direction + ' remote server', err);
          })
          .on('error', function(err) {
            $log.error('Error replicating ' + direction + ' remote server', err);
          })
          .on('paused', function() {
            var now = Date.now();
            var start = replicateTiming[direction].start;
            var last = replicateTiming[direction].last;
            replicateTiming[direction].last = now;

            $log.info('Replicate ' + direction + ' hitting pause after ' +
              ((now - start) / 1000) +
              ' total seconds, with ' +
              ((now - last) / 1000) +
              ' seconds between pauses.', start, last, now);
          })
          .on('complete', function (info) {
            if (!info.ok && authenticationIssue(info.errors)) {
              Session.navigateToLogin();
            }
          });
      };

      var getUserDistrict = function() {
        var deferred = $q.defer();
        UserDistrict(function(err, district) {
          if (err) {
            deferred.reject(err);
            return;
          }
          deferred.resolve(district);
        });
        return deferred.promise;
      };

      var getQueryParams = function(userCtx) {
        return $q.all([Settings(), getUserDistrict()])
          .then(function(values) {
            var settings = values[0];
            var district = values[1];
            var params = { id: district };
            if (utils.hasPerm(userCtx, 'can_view_unallocated_data_records') &&
                settings.district_admins_access_unallocated_messages) {
              params.unassigned = true;
            }
            return params;
          });
      };

      var initialReplicationDone = function(err, replicateDoneCallback) {
        var result = {};
        result.status = err ? 'initial.replication.status.failed' : 'initial.replication.status.complete';
        result.duration = Date.now() - dbSyncStartTime;
        var dbSyncEndData = getDataUsage();
        if (dbSyncStartData && dbSyncEndData) {
          result.dataUsage = {
            rx: dbSyncEndData.app.rx - dbSyncStartData.app.rx,
            tx: dbSyncEndData.app.tx - dbSyncStartData.app.tx,
          };
        }
        dbSyncStartTime = null;
        dbSyncStartData = null;
        $log.info('Initial sync complete in ' + (result.duration / 1000) + ' seconds');
        replicateDoneCallback(null, result);
      };

      var startContinuousReplication = function(params) {
        replicate('from', {
          filter: 'erlang_filters/doc_by_place',
          query_params: params
        });

        replicate('to', {
          filter: function(doc) {
            // don't try to replicate ddoc back to the server
            return doc._id !== '_design/medic';
          }
        });
      };

      return function(replicateDoneCallback) {
        var userCtx = Session.userCtx();
        if (utils.isUserAdmin(userCtx)) {
          // admins have potentially too much data so bypass local pouch
          $log.debug('You have administrative privileges; not replicating');
          return replicateDoneCallback();
        }
        getQueryParams(userCtx)
          .then(function(params) {
            replicate('from', {
              filter: 'erlang_filters/doc_by_place',
              live: false,
              retry: false,
              query_params: params,
              timeout: 30000, // ms
            })
            .then(function() {
              initialReplicationDone(null, replicateDoneCallback);
              startContinuousReplication(params);
            })
            .catch(function(err) {
              initialReplicationDone(err, replicateDoneCallback);
              startContinuousReplication(params);
            });
          })
          .catch(function(err) {
            initialReplicationDone(err, replicateDoneCallback);
          });
      };
    }
  ]);

}());
