var _ = require('underscore');

(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  var safeStringify = function(str) {
    if (_.isString(str)) {
      return str;
    }
    try {
      return JSON.stringify(str);
    } catch(e) {
      return str;
    }
  };

  var mapFeedback = function(data, meta) {
    var result = {
      page: {
        number: data.length,
        total: meta.total_rows
      }
    };
    result.items = _.map(data, function(doc) {
      return {
        id: doc._id,
        time: moment(doc.meta.time),
        info: safeStringify(doc.info)
      };
    });
    return result;
  };

  inboxControllers.controller('ConfigurationExportCtrl',
    ['$scope', 'DownloadUrl', 'DbView',
    function ($scope, DownloadUrl, DbView) {

      var options =  { include_docs: true, descending: true, limit: 20 };
      DbView('feedback', options, function(err, data, meta) {
        if (err) {
          return console.log('Error fetching feedback', err);
        }
        $scope.feedback = mapFeedback(data, meta);
      });

      DownloadUrl(null, 'audit', function(err, url) {
        if (err) {
          return console.log('Error fetching audit url', err);
        }
        $scope.auditUrl = url;
      });

      DownloadUrl(null, 'feedback', function(err, url) {
        if (err) {
          return console.log('Error fetching feedback url', err);
        }
        $scope.feedbackUrl = url;
      });

    }
  ]);

}());