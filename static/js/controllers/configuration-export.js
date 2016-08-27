var _ = require('underscore'),
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
        number: data.rows.length,
        total: data.total_rows
      }
    };
    result.items = _.map(data.rows, function(row) {
      return {
        id: row.doc._id,
        time: moment(row.doc.meta.time),
        info: safeStringify(row.doc.info)
      };
    });
    return result;
  };

  inboxControllers.controller('ConfigurationExportCtrl',
    function (
      $log,
      $scope,
      DB,
      DownloadUrl
    ) {

      'ngInject';

      DB().query('medic-client/feedback', { include_docs: true, descending: true, limit: 20 })
        .then(function(data) {
          $scope.feedback = mapFeedback(data);
        })
        .catch(function(err) {
          return $log.error('Error fetching feedback', err);
        });

      $scope.url = {};

      [ 'logs', 'audit', 'feedback' ].forEach(function(type) {
        DownloadUrl(null, type)
          .then(function(url) {
            $scope.url[type] = url;
          })
          .catch(function(err) {
            $log.error('Error fetching url', err);
          });
      });

    }
  );

}());