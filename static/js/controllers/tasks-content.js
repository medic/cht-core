(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('TasksContentCtrl', 
    ['$scope', '$stateParams',
    function ($scope, $stateParams) {

      $scope.setSelected($stateParams.id);

      $scope.performAction = function(action) {
        if (action.type === 'report') {
          $scope.loadXmlFrom(action.form, null, action.content);
        }
      };

    }
  ]);

}());
