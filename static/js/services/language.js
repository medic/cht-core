(function () {

  'use strict';

  var moment = require('moment');

  var inboxServices = angular.module('inboxServices');
  var localeCookieKey = 'locale';

  inboxServices.factory('SetLanguageCookie', ['ipCookie',
    function(ipCookie) {
      return function(value) {
        ipCookie(localeCookieKey, value, { expires: 365, path: '/' });
        return value;
      };
    }
  ]);

  inboxServices.factory('SetLanguage', ['SetLanguageCookie', '$translate',
    function(SetLanguageCookie, $translate) {
      return function(code) {
        moment.locale([code, 'en']);
        $translate.use(code);
        SetLanguageCookie(code);
      };
    }
  ]);

  inboxServices.factory('Language', [
    '$q', 'ipCookie', 'SetLanguageCookie', 'UserSettings', 'Settings',
    function($q, ipCookie, SetLanguageCookie, UserSettings, Settings) {

      var fetchLocale = function() {
        return $q(function(resolve, reject) {
          UserSettings(function(err, res) {
            if (err) {
              return reject(err);
            }
            if (res && res.language) {
              return resolve(res.language);
            }
            Settings()
              .then(function(settings) {
                resolve(settings.locale || 'en');
              })
              .catch(reject);
          });
        });
      };

      return function() {
        var cookieVal = ipCookie(localeCookieKey);
        if (cookieVal) {
          return $q.resolve(cookieVal);
        }
        return fetchLocale().then(SetLanguageCookie);
      };
    }
  ]);

}());