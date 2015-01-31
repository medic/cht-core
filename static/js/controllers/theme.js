(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('ThemeCtrl',
    ['$scope',
    function ($scope) {
      $scope.filterModel.type = 'configuration';
    }
  ]);

}());