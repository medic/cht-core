var _ = require('underscore'),
    sms_utils = require('kujua-sms/utils');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  inboxServices.factory('FormatDataRecord', ['$q', 'AppInfo',
    function($q, AppInfo) {
      return function(rows) {
        var deferred = $q.defer();
        AppInfo().then(function(appinfo) {
          deferred.resolve(_.map(rows, function(row) {
            return sms_utils.makeDataRecordReadable(row.doc, appinfo);
          }));
        });
        return deferred.promise;
      };
    }
  ]);

}());