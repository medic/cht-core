const moment = require('moment');

(function () {

  'use strict';

  const localeCookieKey = 'locale';

  angular.module('inboxServices').factory('SetLanguageCookie',
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

  angular.module('inboxServices').factory('SetLanguage',
    function(
      $translate,
      SetLanguageCookie
    ) {
      'ngInject';
      
      const setDatepickerLanguage = function(language) {
        const availableCalendarLanguages = Object.keys($.fn.datepicker.dates);
        const calendarLanguage = availableCalendarLanguages.indexOf(language) >= 0 ? language : 'en';
        $.fn.datepicker.defaults.language = calendarLanguage;
      };

      return function(code, setLanguageCookie) {
        moment.locale([code, 'en']);
        setDatepickerLanguage(code);
        $translate.use(code);

        if (setLanguageCookie !== false) {
          SetLanguageCookie(code);
        }
      };
    }
  );

  angular.module('inboxServices').factory('Language',
    function(
      $q,
      SetLanguageCookie,
      Settings,
      UserSettings,
      ipCookie
    ) {

      'ngInject';

      const fetchLocale = function() {
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
        const cookieVal = ipCookie(localeCookieKey);
        if (cookieVal) {
          return $q.resolve(cookieVal);
        }
        return fetchLocale().then(SetLanguageCookie);
      };
    }
  );

}());
