var _ = require('underscore'),
  READ_ONLY_TYPES = ['form', 'translations'],
  READ_ONLY_IDS = ['resources', 'appcache', 'zscore-charts', 'settings'],
  DDOC_PREFIX = ['_design/'],
  SYNC_INTERVAL = 5 * 60 * 1000, // 5 minutes
  META_SYNC_INTERVAL = 30 * 60 * 1000; // 30 minutes

angular
  .module('inboxServices')
  .factory('DBSync', function($interval, $log, $q, Auth, DB, Session) {
    'use strict';
    'ngInject';

    var updateListeners = [];
    var knownOnlineState = true; // assume the user is online
    var syncIsRecent = false; // true when a replication has succeeded within one interval
    var intervalPromises = {
      sync: undefined,
      meta: undefined,
    };

    var authenticationIssue = function(errors) {
      return _.findWhere(errors, { status: 401 });
    };

    var readOnlyFilter = function(doc) {
      // don't try to replicate read only docs back to the server
      return (
        READ_ONLY_TYPES.indexOf(doc.type) === -1 &&
        READ_ONLY_IDS.indexOf(doc._id) === -1 &&
        doc._id.indexOf(DDOC_PREFIX) !== 0
      );
    };

    var getOptions = function(direction) {
      var options = {};
      if (direction === 'to') {
        options.checkpoint = 'source';
        options.filter = readOnlyFilter;
      }

      return options;
    };

    var replicate = function(direction) {
      var options = getOptions(direction);
      var remote = DB({ remote: true });
      return DB()
        .replicate[direction](remote, options)
        .on('denied', function(err) {
          // In theory this could be caused by 401s
          // TODO: work out what `err` looks like and navigate to login
          // when we detect it's a 401
          $log.error('Denied replicating ' + direction + ' remote server', err);
        })
        .on('error', function(err) {
          $log.error('Error replicating ' + direction + ' remote server', err);
        })
        .on('complete', function(info) {
          if (!info.ok && authenticationIssue(info.errors)) {
            Session.navigateToLogin();
          }
        });
    };

    var replicateTo = function() {
      var AUTH_FAILURE = {};
      return Auth('can_edit')
        .catch(function() {
          // not authorized to replicate to server - that's ok. Silently skip replication.to
          return AUTH_FAILURE;
        })
        .then(function(err) {
          if (err !== AUTH_FAILURE) {
            return replicate('to');
          }
        });
    };

    var sendUpdateForDirectedReplication = function(func, direction) {
      return func
        .then(function() {
          sendUpdate({
            direction: direction,
            directedReplicationStatus: 'success',
          });
        })
        .catch(function(error) {
          sendUpdate({
            direction: direction,
            directedReplicationStatus: 'failure',
            error: error,
          });
          return error;
        });
    };

    var syncMeta = function() {
      var remote = DB({ meta: true, remote: true });
      var local = DB({ meta: true });
      local.sync(remote);
    };

    // inProgressSync prevents multiple concurrent replications
    var inProgressSync;
    var sync = function(force) {
      if (!knownOnlineState && !force) {
        return $q.resolve();
      }

      /*
      Controllers need the status of each directed replication (directedReplicationStatus) and the 
      status of the replication as a whole (aggregateReplicationStatus).
      */
      if (!inProgressSync) {
        inProgressSync = $q
          .all([
            sendUpdateForDirectedReplication(replicate('from'), 'from'),
            sendUpdateForDirectedReplication(replicateTo(), 'to'),
          ])
          .then(function(results) {
            var errors = _.filter(results, function(result) {
              return result;
            });
            if (errors.length > 0) {
              $log.error('Error replicating remote server', errors);
              sendUpdate({
                aggregateReplicationStatus: 'required',
                error: errors,
              });
              return;
            }

            syncIsRecent = true;
            sendUpdate({ aggregateReplicationStatus: 'not_required' });
          })
          .finally(function() {
            inProgressSync = undefined;
          });
      }

      sendUpdate({ aggregateReplicationStatus: 'in_progress' });
      return inProgressSync;
    };

    var sendUpdate = function(update) {
      _.forEach(updateListeners, function(listener) {
        listener(update);
      });
    };

    var resetSyncInterval = function() {
      if (intervalPromises.sync) {
        $interval.cancel(intervalPromises.sync);
        intervalPromises.sync = undefined;
      }

      intervalPromises.sync = $interval(function() {
        syncIsRecent = false;
        sync();
      }, SYNC_INTERVAL);
    };

    return {
      /**
       * Adds a listener function to be notified of replication state changes.
       *
       * @param listener {Function} A callback `function (update)`
       */
      addUpdateListener: function(listener) {
        updateListeners.push(listener);
      },

      /**
       * Set the current user's online status to control when replications will be attempted.
       *
       * @param newOnlineState {Boolean} The current online state of the user.
       */
      setOnlineStatus: function(onlineStatus) {
        if (knownOnlineState !== onlineStatus) {
          knownOnlineState = !!onlineStatus;

          if (knownOnlineState && !syncIsRecent) {
            resetSyncInterval();
            return sync();
          }
        }
      },

      /**
       * Synchronize the local database with the remote database.
       *
       * @returns Promise which resolves when both directions of the replication complete.
       */
      sync: function(force) {
        if (Session.isOnlineOnly()) {
          sendUpdate({ disabled: true });
          return $q.resolve();
        }

        if (!intervalPromises.meta) {
          intervalPromises.meta = $interval(syncMeta, META_SYNC_INTERVAL);
          syncMeta();
        }

        resetSyncInterval();
        return sync(force);
      },
    };
  });
