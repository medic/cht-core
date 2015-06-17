(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');
  var localeCookieKey = 'locale';
  
  var fetchLocale = function(User, Settings, callback) {
    User(function(err, res) {
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

  inboxServices.factory('SetLanguageCookie', ['ipCookie',
    function(ipCookie) {
      return function(value) {
        ipCookie(localeCookieKey, value, { expires: 365, path: '/' });
      };
    }
  ]);

  inboxServices.factory('Language', [
    'ipCookie', 'SetLanguageCookie', 'User', 'Settings',
    function(ipCookie, SetLanguageCookie, User, Settings) {
      return function(callback) {
        var cookieVal = ipCookie(localeCookieKey);
        if (cookieVal) {
          return callback(null, cookieVal);
        }
        fetchLocale(User, Settings, function(err, locale) {
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