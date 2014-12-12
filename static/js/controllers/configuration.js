(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('ConfigurationCtrl',
    ['$scope',
    function ($scope) {
      $scope.filterModel.type = 'configuration';
    }
  ]);

}());