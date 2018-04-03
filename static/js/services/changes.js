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
    $q,
    $timeout,
    DB
  ) {

    'use strict';
    'ngInject';

    var RETRY_MILLIS = 5000;

    var dbs = {
      medic: {
        lastSeq: null,
        callbacks: {}
      },
      meta: {
        lastSeq: null,
        callbacks: {}
      }
    };

    var notifyAll = function(meta, change) {
      $log.debug('Change notification firing', meta, change);
      var db = meta ? dbs.meta : dbs.medic;
      db.lastSeq = change.seq;
      Object.keys(db.callbacks).forEach(function(key) {
        var options = db.callbacks[key];
        if (!options.filter || options.filter(change)) {
          try {
            options.callback(change);
          } catch(e) {
            $log.error(new Error('Error executing changes callback: ' + key), e);
          }
        }
      });
    };

    var watches = [];

    var watchChanges = function(meta) {
      $log.info('Initiating changes watch');
      var watch = DB({ meta: meta })
        .changes({
          live: true,
          since: meta ? dbs.meta.lastSeq : dbs.medic.lastSeq,
          timeout: false,
          include_docs: true,
          return_docs: false,
        })
        .on('change', function(change) {
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

    var init = function() {
      $log.info('Initiating changes service');
      watches = [];
      return $q.all([
        DB().info(),
        DB({ meta: true }).info()
      ])
        .then(function(results) {
          dbs.medic.lastSeq = results[0].update_seq;
          dbs.meta.lastSeq = results[1].update_seq;
          watchChanges(false);
          watchChanges(true);
        })
        .catch(function(err) {
          $log.error('Error initialising watching for db changes', err);
          $log.error('Attempting changes initialisation in ' + (RETRY_MILLIS / 1000) + ' seconds');
          return $timeout(init, RETRY_MILLIS);
        });
    };

    var initPromise = init();

    var service = function(options) {
      // Test hook, so we can know when watchChanges is up and running
      if (!options) {
        return initPromise;
      }

      var db = options.metaDb ? dbs.meta : dbs.medic;
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
  }
);
