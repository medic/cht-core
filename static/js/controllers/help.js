(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers'),
      debugCookieName = 'medic-webapp-enableDebug';

  inboxControllers.controller('HelpCtrl',
    ['$scope', 'Session', 'Debug',
    function ($scope, Session, Debug) {
      $scope.filterModel.type = 'help';
      $scope.url = window.location.hostname;
      $scope.userCtx = Session.userCtx();
      $scope.reload = function() {
        window.location.reload(false);
      };
      $scope.enableDebugModel = {
        val: Debug.get()
      };
      $scope.$watch('enableDebugModel.val', Debug.set);
    }
  ]);

}());
