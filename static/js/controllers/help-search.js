var _ = require('underscore');

(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('HelpSearchCtrl',
    ['$scope', '$resource',
    function ($scope, $resource) {
      $scope.loading = true;
      $resource('/api/v1/fti/data_records').get(
        {},
        function(data) {
          $scope.loading = false;
          if (data.fields && data.fields.length) {
            $scope.fields = _.unique(data.fields).sort();
          } else {
            $scope.fields = null;
          }
        },
        function(err) {
          $scope.loading = false;
          console.log('Error fetching fields', err);
        }
      );
    }
  ]);

}());