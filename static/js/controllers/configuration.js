(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('ConfigurationCtrl',
    ['$scope', '$state',
    function ($scope, $state) {
      if (!$scope.permissions || !($scope.permissions.admin || $scope.permissions.nationalAdmin)) {
        console.log('Insufficient permissions. Must be either "admin" or "nationalAdmin".');
        $state.go('error', { code: 403 });
        return;
      }
      $scope.filterModel.type = 'configuration';
    }
  ]);

}());