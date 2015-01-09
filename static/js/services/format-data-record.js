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
          Language(function(err, language) {
            if (err) {
              return console.log('Error loading language', err);
            }
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