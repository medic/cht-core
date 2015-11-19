(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('HelpCtrl',
    ['$scope', 'Session',
    function ($scope, Session) {
      $scope.filterModel.type = 'help';
      $scope.url = window.location.hostname;
      $scope.userCtx = Session.userCtx();
      $scope.reload = function() {
        window.location.reload(false);
      };
    }
  ]);

}());