var _ = require('underscore'),
    async = require('async'),
    moment = require('moment');

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

      var options =  { params: { include_docs: true, descending: true, limit: 20 } };
      DbView('feedback', options, function(err, data, meta) {
        if (err) {
          return console.log('Error fetching feedback', err);
        }
        $scope.feedback = mapFeedback(data, meta);
      });

      $scope.url = {};
      async.each(
        [ 'logs', 'audit', 'feedback' ],
        function(type, callback) {
          DownloadUrl(null, type, function(err, url) {
            if (err) {
              return callback(err);
            }
            $scope.url[type] = url;
            callback();
          });
        },
        function(err) {
          if (err) {
            console.log('Error fetching url', err);
          }
        }
      );

    }
  ]);

}());