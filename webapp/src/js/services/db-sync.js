const READ_ONLY_TYPES = ['form', 'translations'];
const READ_ONLY_IDS = ['resources', 'branding', 'service-worker-meta', 'zscore-charts', 'settings', 'partners'];
const DDOC_PREFIX = ['_design/'];
const LAST_REPLICATED_SEQ_KEY = 'medic-last-replicated-seq';
const LAST_REPLICATED_DATE_KEY = 'medic-last-replicated-date';
const SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes
const META_SYNC_INTERVAL = 30 * 60 * 1000; // 30 minutes

angular
  .module('inboxServices')
  .factory('DBSync', function(
    $interval,
    $log,
    $q,
    $window,
    Auth,
    DB,
    DBSyncRetry,
    Session
  ) {
    'use strict';
    'ngInject';

    const updateListeners = [];
    let knownOnlineState = true; // assume the user is online
    let syncIsRecent = false; // true when a replication has succeeded within one interval
    const intervalPromises = {
      sync: undefined,
      meta: undefined,
    };

    const readOnlyFilter = function(doc) {
      // Never replicate "purged" documents upwards
      const keys = Object.keys(doc);
      if (keys.length === 4 &&
          keys.includes('_id') &&
          keys.includes('_rev') &&
          keys.includes('_deleted') &&
          keys.includes('purged')) {
        return false;
      }

      // don't try to replicate read only docs back to the server
      return (
        READ_ONLY_TYPES.indexOf(doc.type) === -1 &&
        READ_ONLY_IDS.indexOf(doc._id) === -1 &&
        doc._id.indexOf(DDOC_PREFIX) !== 0
      );
    };

    const DIRECTIONS = [
      {
        name: 'to',
        options: {
          filter: readOnlyFilter,
          checkpoint: 'source',
        },
        allowed: () => Auth.has('can_edit'),
        onDenied: DBSyncRetry,
      },
      {
        name: 'from',
        options: {
          heartbeat: 10000, // 10 seconds
          timeout: 1000 * 60 * 10, // 10 minutes
        },
        allowed: () => $q.resolve(true)
      }
    ];

    const replicate = (direction, { batchSize=100 }={}) => {
      const remote = DB({ remote: true });
      const options = Object.assign({}, direction.options, { batch_size: batchSize });
      return DB()
        .replicate[direction.name](remote, options)
        .on('denied', function(err) {
          $log.error(`Denied replicating ${direction.name} remote server`, err);
          if (direction.onDenied) {
            direction.onDenied(err);
          }
        })
        .on('error', function(err) {
          $log.error(`Error replicating ${direction.name} remote server`, err);
        })
        .then(info => {
          $log.debug(`Replication ${direction.name} successful`, info);
          return;
        })
        .catch(err => {
          if (err.code === 413 && direction.name === 'to' && batchSize > 1) {
            batchSize = parseInt(batchSize / 2);
            $log.warn('Error attempting to replicate too much data to the server. ' +
              `Trying again with batch size of ${batchSize}`);
            return replicate(direction, { batchSize });
          }
          $log.error(`Error replicating ${direction.name} remote server`, err);
          return direction.name;
        });
    };

    const replicateIfAllowed = direction => {
      return direction.allowed().then(allowed => {
        if (!allowed) {
          // not authorized to replicate - that's ok, skip silently
          return;
        }
        return replicate(direction);
      });
    };

    const getCurrentSeq = () => DB().info().then(info => info.update_seq + '');
    const getLastReplicatedSeq = () => $window.localStorage.getItem(LAST_REPLICATED_SEQ_KEY);

    // inProgressSync prevents multiple concurrent replications
    let inProgressSync;

    const sync = force => {
      if (!knownOnlineState && !force) {
        return $q.resolve();
      }

      if (!inProgressSync) {
        inProgressSync = $q
          .all(DIRECTIONS.map(direction => replicateIfAllowed(direction)))
          .then(errs => {
            return getCurrentSeq().then(currentSeq => {
              errs = errs.filter(err => err);
              let update = { to: 'success', from: 'success' };
              if (!errs.length) {
                // no errors
                syncIsRecent = true;
                $window.localStorage.setItem(LAST_REPLICATED_SEQ_KEY, currentSeq);
              } else if (currentSeq === getLastReplicatedSeq()) {
                // no changes to send, but may have some to receive
                update = { state: 'unknown' };
              } else {
                // definitely need to sync something
                errs.forEach(err => {
                  update[err] = 'required';
                });
              }
              if (update.to === 'success') {
                $window.localStorage.setItem(LAST_REPLICATED_DATE_KEY, Date.now());
              }
              sendUpdate(update);
            });
          })
          .finally(() => {
            inProgressSync = undefined;
          });
      }

      sendUpdate({ state: 'inProgress' });
      return inProgressSync;
    };

    const syncMeta = function() {
      const remote = DB({ meta: true, remote: true });
      const local = DB({ meta: true });
      local.sync(remote);
    };

    const sendUpdate = update => {
      updateListeners.forEach(listener => listener(update));
    };

    const resetSyncInterval = () => {
      if (intervalPromises.sync) {
        $interval.cancel(intervalPromises.sync);
        intervalPromises.sync = undefined;
      }

      intervalPromises.sync = $interval(() => {
        syncIsRecent = false;
        sync();
      }, SYNC_INTERVAL);
    };

    // online users have potentially too much data so bypass local pouch
    const isEnabled = () => !Session.isOnlineOnly();

    return {
      /**
       * Adds a listener function to be notified of replication state changes.
       *
       * @param listener {Function} A callback `function (update)`
       */
      addUpdateListener: listener => {
        updateListeners.push(listener);
      },

      /**
       * Boolean representing if sync is curently in progress
       */
      isSyncInProgress: () => !!inProgressSync,

      /**
       * Set the current user's online status to control when replications will be attempted.
       *
       * @param newOnlineState {Boolean} The current online state of the user.
       */
      setOnlineStatus: onlineStatus => {
        if (knownOnlineState !== onlineStatus) {
          knownOnlineState = !!onlineStatus;

          if (knownOnlineState && !syncIsRecent) {
            resetSyncInterval();
            return sync();
          }
        }
      },

      /**
       * @returns {boolean} Whether or not syncing is available for this user.
       */
      isEnabled: isEnabled,

      /**
       * Synchronize the local database with the remote database.
       *
       * @returns Promise which resolves when both directions of the replication complete.
       */
      sync: force => {
        if (!isEnabled()) {
          sendUpdate({ state: 'disabled' });
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
