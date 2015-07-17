var _ = require('underscore'),
    sms_utils = require('kujua-sms/utils');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  inboxServices.factory('FormatDataRecord', ['AppInfo', 'Language',
    function(AppInfo, Language) {
      return function(docs, callback) {
        AppInfo(function(err, appinfo) {
          if (err) {
            return callback(err);
          }
          Language(function(err, language) {
            if (err) {
              return callback(err);
            }
            var res = _.map(docs, function(doc) {
              return sms_utils.makeDataRecordReadable(doc, appinfo, language);
            });
            callback(null, res);
          });
        });
      };
    }
  ]);

}());