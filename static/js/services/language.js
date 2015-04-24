(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');
  var localeCookieKey = 'locale';
  
  var fetchLocale = function(User, Settings, options, callback) {
    User(options, function(err, res) {
      if (err) {
        return callback(err);
      }
      if (res && res.language) {
        return callback(null, res.language);
      }
      Settings(options, function(err, res) {
        if (err) {
          return callback(err);
        }
        callback(null, res.locale || 'en');
      });
    });
  };

  inboxServices.factory('SetLanguageCookie', ['ipCookie',
    function(ipCookie) {
      return function(value) {
        ipCookie(localeCookieKey, value, { expires: 365, path: '/' });
      };
    }
  ]);

  inboxServices.factory('Language', ['ipCookie', 'SetLanguageCookie', 'User', 'Settings',
    function(ipCookie, SetLanguageCookie, User, Settings) {
      return function(options, callback) {
        if (!callback) {
          callback = options;
          options = {};
        }
        options = options || {};
        var cookieVal = ipCookie(localeCookieKey);
        if (cookieVal) {
          return callback(null, cookieVal);
        }
        fetchLocale(User, Settings, options, function(err, locale) {
          if (err) {
            return callback(err);
          }
          SetLanguageCookie(locale);
          callback(null, locale);
        });
      };
    }
  ]);

}());