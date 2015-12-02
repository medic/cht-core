(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('HelpCtrl',
    ['$scope', 'Session', 'Debug', 'DB',
    function ($scope, Session, Debug, DB) {
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
      DB.get().info().then(function (result) {
        $scope.dbInfo = JSON.stringify(result, null, 2);
      }).catch(function (err) {
        console.error('Failed to fetch DB info', err);
      });
    }
  ]);

}());
