/**
 * Module to listen for database changes.
 *
 * @param (Object) options
 *   - id (String): Some unique id to stop duplicate registrations
 *   - callback (function): The function to invoke when a change is detected.
 *        The function is given the pouchdb change object as a parameter
 *        including the changed doc.
 *   - filter (function) (optional): A function to invoke to determine if the
 *        callback should be called on the given change object.
 * @returns (Object)
 *   - unsubscribe (function): Invoke this function to stop being notified of
 *        any further changes.
 */
angular.module('inboxServices').factory('Changes',
  function(
    $log,
    $timeout,
    $q,
    DB
  ) {

    'use strict';
    'ngInject';

    var callbacks = {};

    var lastSeq;

    var notifyAll = function(change) {
      $log.debug('Change notification firing', change);
      lastSeq = change.seq;
      Object.keys(callbacks).forEach(function(key) {
        var options = callbacks[key];
        if (!options.filter || options.filter(change)) {
          try {
            options.callback(change);
          } catch(e) {
            $log.error(new Error('Error executing changes callback: ' + key), e);
          }
        }
      });
    };

    var RETRY_MILLIS = 5000;

    var watchChanges = function() {
      $log.info('Initiating changes watch');
      DB()
        .changes({
          live: true,
          since: lastSeq,
          timeout: false,
          include_docs: true
        })
        .on('change', notifyAll)
        .on('error', function(err) {
          $log.error('Error watching for db changes', err);
          $log.error('Attempting changes reconnection in ' + (RETRY_MILLIS / 1000) + ' seconds');
          $timeout(watchChanges, RETRY_MILLIS);
        });
    };

    var init = function() {
      $log.info('Initiating changes service');
      return DB().info().then(function(info) {
        lastSeq = info.update_seq;
      })
      .then(watchChanges)
      .catch(function(err) {
        $log.error('Error initialising watching for db changes', err);
        $log.error('Attempting changes initialisation in ' + (RETRY_MILLIS / 1000) + ' seconds');
        return $q(function(resolve) {
          $timeout(function() {
            resolve(init);
          }, RETRY_MILLIS);
        });
      });
    };

    var initPromise = init();

    return function(options) {
      // Test hook, so we can know when watchChanges is up and running
      if (!options) {
        return initPromise;
      }

      callbacks[options.key] = options;
      return {
        unsubscribe: function() {
          delete callbacks[options.key];
        }
      };
    };
  }

);
