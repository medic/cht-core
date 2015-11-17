(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('HelpCtrl',
    ['$scope',
    function ($scope) {
      $scope.filterModel.type = 'help';
      $scope.url = window.location.hostname;
      $scope.reload = function() {
        window.location.reload(false);
      };
    }
  ]);

}());