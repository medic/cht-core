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

    // Longpoll requests like changes hangs protractor testing as it waits
    // for all requests to finish.
    if (!E2ETESTING) {
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
        });
    }

    return function(options) {
      console.log('SUBSCRIBING', options.key);
      callbacks[options.key] = options;
      return {
        unsubscribe: function() {
          console.log('UNSUBSCRIBING', options.key);
          delete callbacks[options.key];
        }
      };
    };
  }

);
