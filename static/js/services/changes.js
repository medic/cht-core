/**
 * Module to ensure changes listeners are singletons. Registering a
 * listener with this module will replace the previously registered
 * listener with the same key.
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
      if (options.callback) {
        callbacks[options.key] = options;
      } else {
        delete callbacks[options.key];
      }
    };
  }

);
