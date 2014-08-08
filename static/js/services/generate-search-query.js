var _ = require('underscore');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  inboxServices.factory('GenerateSearchQuery', [
    function() {

      var formatDate = function(date) {
        return date.zone(0).format('YYYY-MM-DD');
      };

      var formatReportedDate = function($scope) {
        // increment end date so it's inclusive
        var to = moment($scope.filterModel.date.to).add(1, 'days');
        var from = moment($scope.filterModel.date.from);
        return 'reported_date<date>:[' + 
            formatDate(from) + ' TO ' + formatDate(to) + 
            ']';
      };

      var formatType = function($scope) {
        if ($scope.filterModel.type === 'reports') {
          return 'type:report';
        }
        if ($scope.filterModel.messageTypes.length === 0) {
          return 'type:message*';
        }
        var types = [];
        $scope.filterModel.messageTypes.forEach(function(value) {
          var filter = 'type:' + value.type;
          if (value.state) {
            filter = '(' + filter + ' AND state:' + value.state + ')';
          }
          types.push(filter);
        });
        return '(' + types.join(' OR ') + ')';
      };

      var formatForm = function($scope) {
        var selectedForms = $scope.filterModel.forms.length;
        if (selectedForms > 0 && selectedForms < $scope.forms.length) {
          var formCodes = [];
          $scope.filterModel.forms.forEach(function(form) {
            formCodes.push(form.code);
          });
          return 'form:(' + formCodes.join(' OR ') + ')';
        }
      };

      var formatErrors = function($scope) {
        if ($scope.filterModel.valid === true) {
          return 'errors<int>:0';
        }
        if ($scope.filterModel.valid === false) {
          return 'NOT errors<int>:0';
        }
      };

      var formatClinics = function($scope) {
        var selectedFacilities = $scope.filterModel.facilities.length;
        if (selectedFacilities > 0 && selectedFacilities < $scope.facilities.length) {
          return 'clinic:(' + $scope.filterModel.facilities.join(' OR ') + ')';
        }
      };

      return function($scope) {
        var filters = [];

        if ($scope.filterSimple) {

          filters.push(formatReportedDate($scope));
          filters.push(formatType($scope));
          filters.push(formatClinics($scope));

          if ($scope.filterModel.type === 'reports') {
            filters.push(formatForm($scope));
            filters.push(formatErrors($scope));
          }

        } else {

          if ($scope.filterQuery && $scope.filterQuery.trim()) {
            filters.push($scope.filterQuery);
          }
          var type = $scope.filterModel.type === 'messages' ?
            'message*' : 'report';
          filters.push('type:' + type);

        }

        return _.compact(filters).join(' AND ');
        
      };
    }
  ]);
}());