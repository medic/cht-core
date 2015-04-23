var _ = require('underscore'),
    async = require('async');

(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('HelpSearchCtrl',
    ['$scope', '$http',
    function ($scope, $http) {
      $scope.loading = true;
      $scope.indexes = [];

      async.each(
        [ 'data_records', 'contacts' ],
        function(index, callback) {
          $http.get('/api/v1/fti/' + index)
            .success(function(data) {
              if (data.fields && data.fields.length) {
                $scope.indexes.push({
                  name: index,
                  fields: _.unique(data.fields).sort()
                });
              }
              callback();
            })
            .error(function(data) {
              callback(new Error(data));
            });
        },
        function(err) {
          if (err) {
            console.log(err);
          }
          $scope.loading = false;
        }
      );
    }
  ]);

}());