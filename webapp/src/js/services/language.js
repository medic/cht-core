var moment = require('moment');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');
  var localeCookieKey = 'locale';

  inboxServices.factory('SetLanguageCookie',
    function(
      ipCookie
    ) {
      'ngInject';
      return function(value) {
        ipCookie(localeCookieKey, value, { expires: 365, path: '/' });
        return value;
      };
    }
  );

  inboxServices.factory('SetLanguage',
    function(
      $translate,
      SetLanguageCookie,
      SetDatepickerLanguage
    ) {
      'ngInject';
      return function(code) {
        moment.locale([code, 'en']);
        SetDatepickerLanguage(code);
        $translate.use(code);
        SetLanguageCookie(code);
      };
    }
  );

  inboxServices.factory('SetDatepickerLanguage',
    function() {
      'ngInject';

      return function(language) {
        var availableCalendarLanguages = Object.keys($.fn.datepicker.dates);
        var calendarLanguage = availableCalendarLanguages.indexOf(language) >= 0 ? language : 'en';
        $.fn.datepicker.defaults.language = calendarLanguage;
      };
    }
  );

  inboxServices.factory('Language',
    function(
      $q,
      ipCookie,
      SetLanguageCookie,
      Settings,
      UserSettings
    ) {

      'ngInject';

      var fetchLocale = function() {
        return UserSettings()
          .then(function(user) {
            if (user && user.language) {
              return user.language;
            }
            return Settings()
              .then(function(settings) {
                return settings.locale || 'en';
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
  );

}());