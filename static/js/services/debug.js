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
angular.module('inboxServices').config([
  '$provide', '$logProvider', function($provide, $logProvider) {
    $provide.service('Debug', [
      'ipCookie', 'pouchDB', function(ipCookie, pouchDB) {
        var cookieName = 'medic-webapp-debug';
        var get = function() {
          return Boolean(ipCookie(cookieName));
        };
        var set = function(bool) {
          // this changes the default angular behavior and hides debug level
          // log messages.
          $logProvider.debugEnabled(bool);
          var db = pouchDB.debug ? pouchDB : window.PouchDB;
          if (bool) {
            console.log('set cookie, enabled debug');
            db.debug.enable('*');
            ipCookie(cookieName, bool, {expires: 360});
          } else {
            console.log('remove cookie');
            db.debug.disable();
            ipCookie.remove(cookieName);
          }
        };
        set(get()); // initialize
        return {
          get: get,
          set: set
        };
      }
    ]);
  }
]);
