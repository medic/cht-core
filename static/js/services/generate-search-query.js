var _ = require('underscore'),
    moment = require('moment'),
    schema = {
      errors: 'int',
      verified: 'boolean',
      reported_date: 'date'
    };

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  inboxServices.factory('GenerateSearchQuery', [
    function() {

      var formatDate = function(date) {
        return date.utcOffset(0).format('YYYY-MM-DD');
      };

      var formatReportedDate = function($scope) {
        if ($scope.filterModel.date.to || $scope.filterModel.date.from) {
          // increment end date so it's inclusive
          var to = moment($scope.filterModel.date.to).add(1, 'days');
          var from = moment($scope.filterModel.date.from || 0);
          return {
            reported_date: { $from: formatDate(from), $to: formatDate(to) }
          };
        }
      };

      var formatType = function($scope) {
        return {
          type: $scope.filterModel.type === 'reports' ? 'report' : 'message*'
        };
      };

      var formatForm = function($scope) {
        var selectedForms = $scope.filterModel.forms.length;
        if (selectedForms > 0 && selectedForms < $scope.forms.length) {
          return {
            form: _.pluck($scope.filterModel.forms, 'code')
          };
        }
      };

      var formatErrors = function($scope) {
        if ($scope.filterModel.valid === true) {
          return { errors: 0 };
        }
        if ($scope.filterModel.valid === false) {
          return {
            $operator: 'not',
            $operands: { errors: 0 }
          };
        }
      };

      var formatVerified = function($scope) {
        if ($scope.filterModel.verified === true) {
          return { verified: true };
        }
        if ($scope.filterModel.verified === false) {
          return { verified: false };
        }
      };

      var formatClinics = function($scope) {
        var selectedFacilities = $scope.filterModel.facilities.length;
        if (selectedFacilities > 0 && selectedFacilities < $scope.facilities.length) {
          return { clinic: $scope.filterModel.facilities };
        }
      };

      var formatIds = function(options) {
        if (options.changes && options.changes.length) {
          return { uuid: _.pluck(options.changes, 'id') };
        }
      };

      var formatFreetext = function($scope) {
        var freetext = $scope.filterQuery.value;
        if (freetext && freetext.indexOf(':') === -1) {
          freetext += '*';
        }
        return freetext;
      };

      return function($scope, options, callback) {

        if (!callback) {
          callback = options;
          options = {};
        }

        var operands = [];

        if (!options.ignoreFilter) {
          operands.push(formatFreetext($scope));
          operands.push(formatReportedDate($scope));
          operands.push(formatType($scope));
          operands.push(formatClinics($scope));
          operands.push(formatForm($scope));
          operands.push(formatErrors($scope));
          operands.push(formatVerified($scope));
        }
        operands.push(formatIds(options));

        callback(null, {
          schema: schema,
          query: { $operands: _.compact(operands) }
        });

      };
    }
  ]);
}());