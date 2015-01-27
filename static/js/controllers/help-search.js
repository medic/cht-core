var _ = require('underscore');

(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('HelpSearchCtrl',
    ['$scope', '$rootScope', 'db',
    function ($scope, $rootScope, db) {
      $scope.loading = true;
      db.getFTI(
        'medic',
        'data_records',
        {},
        function(data) {
          $scope.loading = false;
          if (data.fields && data.fields.length) {
            $scope.fields = _.unique(data.fields).sort();
          } else {
            $scope.fields = null;
          }
          if (!$rootScope.$$phase) {
            $rootScope.$apply();
          }
        }
      );
    }
  ]);

}());