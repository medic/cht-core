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
    DB,
    E2ETESTING
  ) {

    'use strict';
    'ngInject';

    var callbacks = {};

    var notifyAll = function(change) {
      $log.debug('Change notification firing', change);
      Object.keys(callbacks).forEach(function(key) {
        var options = callbacks[key];
        if (!options.filter || options.filter(change)) {
          options.callback(change);
        }
      });
    };


    var watchChanges = function() {
      var RETRY_MILLIS = 5000;

      $log.info('Initiating changes watch');
      DB()
        .changes({
          live: true,
          since: 'now',
          timeout: false,
          include_docs: true
        })
        .on('change', notifyAll)
        .on('error', function(err) {
          $log.error('Error watching for db changes', err);
          $log.error('Attempting changes reconnection in 5 seconds');
          $timeout(watchChanges, RETRY_MILLIS);
        });
    };

    // Longpoll requests like changes hangs protractor testing as it waits
    // for all requests to finish.
    if (!E2ETESTING) {
      watchChanges();
    }

    return function(options) {
      callbacks[options.key] = options;
      return {
        unsubscribe: function() {
          delete callbacks[options.key];
        }
      };
    };
  }

);
