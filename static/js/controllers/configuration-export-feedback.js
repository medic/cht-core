var moment = require('moment');

angular.module('inboxControllers').controller('ConfigurationExportFeedbackCtrl',
  function (
    $log,
    $scope,
    DB,
    Export
  ) {

    'use strict';
    'ngInject';

    var safeStringify = function(str) {
      if (typeof str === 'string') {
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
      result.items = data.rows.map(function(row) {
        return {
          id: row.doc._id,
          time: moment(row.doc.meta.time),
          info: safeStringify(row.doc.info)
        };
      });
      return result;
    };

    DB().query('medic-client/feedback', { include_docs: true, descending: true, limit: 20 })
      .then(function(data) {
        $scope.feedback = mapFeedback(data);
      })
      .catch(function(err) {
        return $log.error('Error fetching feedback', err);
      });

    $scope.export = function() {
      $scope.exporting = true;
      Export({}, 'feedback').then(function() {
        $scope.exporting = false;
      });
    };

  }
);
