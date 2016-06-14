var _ = require('underscore'),
    ALL_KEY = [ '_all' ], // key in the doc_by_place view for records everyone can access
    UNASSIGNED_KEY = [ '_unassigned' ]; // key in the doc_by_place view for unassigned records

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
    return _.findWhere(errors, { status: 401 });
  };

  inboxServices.factory('DBSync',
    function(
      $log,
      $q,
      Auth,
      DB,
      Session,
      Settings,
      UserDistrict
    ) {

      'ngInject';

      var getViewKeys = function() {
        var keys = [ ALL_KEY ];
        return UserDistrict()
          .then(function(facilityId) {
            if (facilityId) {
              keys.push([ facilityId ]);
            }
          })
          .then(Settings)
          .then(function(settings) {
            if (settings.district_admins_access_unallocated_messages) {
              return Auth('can_view_unallocated_data_records')
                .then(function() {
                  keys.push(UNASSIGNED_KEY);
                })
                .catch(function() {
                  // can't view unallocated - swallow and continue
                });
            }
          })
          .then(function() {
            return keys;
          });
      };

      var getOptions = function(direction, options) {
        options = options || {};
        _.defaults(options, {
          live: true,
          retry: true,
          timeout: false,
          heartbeat: 10000,
          back_off_function: backOffFunction
        });
        if (direction === 'from') {
          return getViewKeys()
            .then(function(keys) {
              return DB.get().query('medic/doc_by_place', { keys: keys });
            })
            .then(function(viewResult) {
              var userCtx = Session.userCtx();
              var ids = _.pluck(viewResult.rows, 'id');
              ids.push('org.couchdb.user:' + userCtx && userCtx.name);
              return ids;
            })
            .then(function(ids) {
              options.doc_ids = ids;
              return options;
            });
        } else {
          return $q.resolve(options);
        }
      };

      var getDataUsage = function() {
        if (window.medicmobile_android && window.medicmobile_android.getDataUsage) {
          return JSON.parse(window.medicmobile_android.getDataUsage());
        }
      };

      var dbSyncStartTime = Date.now();
      var dbSyncStartData = getDataUsage();
      var replicateTiming = {};

      var replicate = function(direction, options) {
        return getOptions(direction, options)
          .then(function(options) {
            replicateTiming[direction] = {};
            replicateTiming[direction].start =
              replicateTiming[direction].last = Date.now();
            var remote = DB.get({ remote: true });
            return DB.get().replicate[direction](remote, options)
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
          })
          .catch(function(err) {
            $log.error('Error getting sync options', err);
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

      var startContinuousReplication = function() {
        replicate('from');
        replicate('to', {
          filter: function(doc) {
            // don't try to replicate ddoc back to the server
            return doc._id !== '_design/medic';
          }
        });
      };

      return function(replicateDoneCallback) {
        if (Session.isAdmin()) {
          // admins have potentially too much data so bypass local pouch
          $log.debug('You have administrative privileges; not replicating');
          return replicateDoneCallback();
        }

        replicate('from', {
          live: false,
          retry: false,
          timeout: 30000,
          heartbeat: false
        })
          .then(function() {
            initialReplicationDone(null, replicateDoneCallback);
            startContinuousReplication();
          })
          .catch(function(err) {
            initialReplicationDone(err, replicateDoneCallback);
            startContinuousReplication();
          });
      };
    }
  );

}());
