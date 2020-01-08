/*
 * Manage debug mode.
 *
 * When enabled:
 *
 *   - persist setting to a cookie
 *   - put PouchDB in debug mode
 *   - display $log.debug() output throughout the app
 *
 */
angular.module('inboxServices').config(
  function(
    $logProvider,
    $provide
  ) {
    'use strict';
    'ngInject';

    $provide.service('Debug', [
      '$window',
      'ipCookie',
      'pouchDB',
      function(
        $window,
        ipCookie,
        pouchDB
      ) {
        const cookieName = 'medic-webapp-debug';
        const get = function() {
          return Boolean(ipCookie(cookieName));
        };
        const set = function(bool) {
          // this changes the default angular behavior and hides debug level
          // log messages.
          $logProvider.debugEnabled(bool);
          const db = pouchDB.debug ? pouchDB : $window.PouchDB;
          if (bool) {
            db.debug.enable('*');
            ipCookie(cookieName, bool, { expires: 360, path: '/' });
          } else {
            db.debug.disable();
            ipCookie.remove(cookieName, { path: '/' });
          }
        };
        return {
          get: get,
          set: set
        };
      }
    ]);
  }
);
