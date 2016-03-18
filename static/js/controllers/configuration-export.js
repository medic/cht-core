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

  var mapFeedback = function(data) {
    var result = {
      page: {
        number: data.results.length,
        total: data.meta.total_rows
      }
    };
    result.items = _.map(data.results, function(doc) {
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
      DbView('feedback', options)
        .then(function(data) {
          $scope.feedback = mapFeedback(data);
        })
        .catch(function(err) {
          return console.error('Error fetching feedback', err);
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
            console.error('Error fetching url', err);
          }
        }
      );

    }
  ]);

}());