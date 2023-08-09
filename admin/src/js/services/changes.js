/**
 * Module to listen for database changes.
 *
 * This function combines all the app changes listeners into one
 * db listener so only one connection is required.
 *
 * @param (Object) options
 *   - id (String): Some unique id to stop duplicate registrations
 *   - callback (function): The function to invoke when a change is detected.
 *        The function is given the pouchdb change object as a parameter
 *        including the changed doc.
 *   - filter (function) (optional): A function to invoke to determine if the
 *        callback should be called on the given change object.
 *   - metaDb (boolean) (optional): Watch the meta db instead of the medic db
 * @returns (Object)
 *   - unsubscribe (function): Invoke this function to stop being notified of
 *        any further changes.
 */
angular.module('inboxServices').factory('Changes',
  function(
    $log,
    $ngRedux,
    $q,
    $timeout,
    DB,
    Selectors,
    ServicesActions,
    Session
  ) {

    'use strict';
    'ngInject';

    const RETRY_MILLIS = 5000;

    const self = this;
    const mapStateToTarget = (state) => ({
      lastChangedDoc: Selectors.getLastChangedDoc(state),
    });
    const mapDispatchToTarget = (dispatch) => {
      const servicesActions = ServicesActions(dispatch);
      return {
        setLastChangedDoc: servicesActions.setLastChangedDoc
      };
    };

    $ngRedux.connect(mapStateToTarget, mapDispatchToTarget)(self);

    const dbs = {
      medic: {
        lastSeq: null,
        callbacks: {},
        watchIncludeDocs: true
      },
      meta: {
        lastSeq: null,
        callbacks: {},
        watchIncludeDocs: true
      }
    };

    const notifyAll = function(meta, change) {
      $log.debug('Change notification firing', meta, change);
      const db = meta ? dbs.meta : dbs.medic;
      db.lastSeq = change.seq;
      Object.keys(db.callbacks).forEach(function(key) {
        const options = db.callbacks[key];
        if (!options.filter || options.filter(change)) {
          try {
            options.callback(change);
          } catch(e) {
            $log.error(new Error('Error executing changes callback: ' + key), e);
          }
        }
      });
    };

    let watches = [];

    const watchChanges = function(meta) {
      $log.info(`Initiating changes watch (meta=${meta})`);
      const db = meta ? dbs.meta : dbs.medic;
      const watch = DB({ meta: meta })
        .changes({
          live: true,
          since: db.lastSeq,
          timeout: false,
          include_docs: db.watchIncludeDocs,
          return_docs: false,
        })
        .on('change', function(change) {
          if (self.lastChangedDoc && self.lastChangedDoc._id === change.id) {
            change.doc = change.doc || self.lastChangedDoc;
            self.setLastChangedDoc(false);
          }

          notifyAll(meta, change);
        })
        .on('error', function(err) {
          $log.error('Error watching for db changes', err);
          $log.error('Attempting changes reconnection in ' + (RETRY_MILLIS / 1000) + ' seconds');
          $timeout(function() {
            watchChanges(meta);
          }, RETRY_MILLIS);
        });

      watches.push(watch);
    };

    const init = function() {
      $log.info('Initiating changes service');
      watches = [];
      return $q.all([
        DB().info(),
        DB({ meta: true }).info()
      ])
        .then(function(results) {
          dbs.medic.lastSeq = results[0].update_seq;
          dbs.meta.lastSeq = results[1].update_seq;
          dbs.medic.watchIncludeDocs = !Session.isOnlineOnly();
          watchChanges(false);
          watchChanges(true);
        })
        .catch(function(err) {
          $log.error('Error initialising watching for db changes', err);
          $log.error('Attempting changes initialisation in ' + (RETRY_MILLIS / 1000) + ' seconds');
          return $timeout(init, RETRY_MILLIS);
        });
    };

    const initPromise = init();

    const service = function(options) {
      // Test hook, so we can know when watchChanges is up and running
      if (!options) {
        return initPromise;
      }

      const db = options.metaDb ? dbs.meta : dbs.medic;
      db.callbacks[options.key] = options;

      return {
        unsubscribe: function() {
          delete db.callbacks[options.key];
        }
      };
    };

    service.killWatchers = function() {
      watches.forEach(function(watch) {
        watch.cancel();
      });
    };

    return service;
  });
