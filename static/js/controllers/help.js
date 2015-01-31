(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('HelpCtrl',
    ['$scope',
    function ($scope) {
      $scope.filterModel.type = 'help';
    }
  ]);

}());