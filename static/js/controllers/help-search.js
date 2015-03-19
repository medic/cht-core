var _ = require('underscore'),
    async = require('async');

(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('HelpSearchCtrl',
    ['$scope', '$resource',
    function ($scope, $resource) {
      $scope.loading = true;
      $scope.indexes = [];

      async.each(
        ['data_records','contacts'],
        function(index, callback) {
          $resource('/api/v1/fti/' + index).get(
            {},
            function(data) {
              if (data.fields && data.fields.length) {
                $scope.indexes.push({
                  name: index,
                  fields: _.unique(data.fields).sort()
                });
              }
              callback();
            },
            callback
          );
        },
        function(err) {
          if (err) {
            console.log('Error fetching fields', err);
          }
          $scope.loading = false;
        }
      );
    }
  ]);

}());