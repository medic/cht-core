angular
  .module('controllers')
  .controller('ExportFeedbackCtrl', function($log, $scope, DB, Export) {
    'use strict';
    'ngInject';

    var MESSAGE_LIMIT = 120;

    var formattedMessage = function(msg) {
      var suffix = msg.length > MESSAGE_LIMIT ? '...' : '';
      return msg.substring(0, MESSAGE_LIMIT) + suffix;
    };

    var safeStringify = function(str) {
      if (typeof str === 'string') {
        // User typed feedback
        return str;
      }
      try {
        // Pouchdb automated log; can be massive hence the limit
        str.message = formattedMessage(str.message);
        return JSON.stringify(str);
      } catch (e) {
        return str;
      }
    };

    var mapFeedback = function(data) {
      var result = {
        page: {
          number: data.rows.length,
          total: data.total_rows,
        },
      };
      result.items = data.rows.map(function(row) {
        return {
          id: row.doc._id,
          time: row.doc.meta.time,
          info: safeStringify(row.doc.info),
        };
      });
      return result;
    };

    DB()
      .query('medic-admin/feedback', {
        include_docs: true,
        descending: true,
        limit: 20,
      })
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
  });
