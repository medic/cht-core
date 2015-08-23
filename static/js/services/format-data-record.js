var _ = require('underscore'),
    sms_utils = require('kujua-sms/utils');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  inboxServices.factory('FormatDataRecord', ['AppInfo', 'Language',
    function(AppInfo, Language) {
      return function(docs) {
        return Promise.all([ AppInfo(), Language() ])
          .then(function(results) {
            if (!_.isArray(docs)) {
              docs = [ docs ];
            }
            return _.map(docs, function(doc) {
              return sms_utils.makeDataRecordReadable(doc, results[0], results[1]);
            });
          });
      };
    }
  ]);

}());