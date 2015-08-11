var promise = require('lie');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');
  var localeCookieKey = 'locale';

  inboxServices.factory('SetLanguageCookie', ['ipCookie',
    function(ipCookie) {
      return function(value) {
        ipCookie(localeCookieKey, value, { expires: 365, path: '/' });
      };
    }
  ]);

  inboxServices.factory('Language', [
    'ipCookie', 'SetLanguageCookie', 'UserSettings', 'Settings',
    function(ipCookie, SetLanguageCookie, UserSettings, Settings) {

      var fetchLocale = function(callback) {
        UserSettings(function(err, res) {
          if (err) {
            return callback(err);
          }
          if (res && res.language) {
            return callback(null, res.language);
          }
          Settings(function(err, res) {
            if (err) {
              return callback(err);
            }
            callback(null, res.locale || 'en');
          });
        });
      };

      var get = function(callback) {
        var cookieVal = ipCookie(localeCookieKey);
        if (cookieVal) {
          return callback(null, cookieVal);
        }
        fetchLocale(function(err, locale) {
          if (err) {
            return callback(err);
          }
          SetLanguageCookie(locale);
          callback(null, locale);
        });
      };

      return function(callback) {
        if (callback) {
          get(callback);
        } else {
          return new promise(function(resolve, reject) {
            get(function(err, locale) {
              if (err) {
                reject(err);
              } else {
                resolve(locale);
              }
            });
          });
        }
      };
    }
  ]);

}());