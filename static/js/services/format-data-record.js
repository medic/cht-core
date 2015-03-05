var _ = require('underscore'),
    sms_utils = require('kujua-sms/utils');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  inboxServices.factory('FormatDataRecord', ['AppInfo', 'Language',
    function(AppInfo, Language) {
      return function(rows, callback) {
        AppInfo(function(err, appinfo) {
          if (err) {
            return callback(err);
          }
          Language(function(err, language) {
            if (err) {
              return callback(err);
            }
            callback(null, (_.map(rows, function(row) {
              return sms_utils.makeDataRecordReadable(row.doc, appinfo, language);
            })));
          });
        });
      };
    }
  ]);

}());