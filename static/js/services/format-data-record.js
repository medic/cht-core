var _ = require('underscore'),
    sms_utils = require('kujua-sms/utils');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  inboxServices.factory('FormatDataRecord', ['$q', 'AppInfo', 'Language',
    function($q, AppInfo, Language) {
      return function(rows) {
        var deferred = $q.defer();
        AppInfo().then(function(appinfo) {
          Language().then(function(language) {
            language = language || 'en';
            deferred.resolve(_.map(rows, function(row) {
              return sms_utils.makeDataRecordReadable(row.doc, appinfo, language);
            }));
          });
        });
        return deferred.promise;
      };
    }
  ]);

}());