var moment = require('moment');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  inboxServices.factory('SetLanguage',
    function(
      $translate
    ) {
      'ngInject';
      return function(code) {
        moment.locale([code, 'en']);
        $translate.use(code);
      };
    }
  );

  inboxServices.factory('Language',
    function(
      $q,
      ipCookie,
      Settings,
      UserSettings
    ) {
      'ngInject';
      return function () {
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
    }
  );

}());
