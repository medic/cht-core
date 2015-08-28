(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('TasksContentCtrl', 
    ['$scope', '$stateParams',
    function ($scope, $stateParams) {

      $scope.setSelectedId($stateParams.id);

      $scope.performAction = function(action) {
        if (action.type === 'report') {
          /* globals loadXmlFrom */
          loadXmlFrom(action.form, null, action.content);
        }
      };

    }
  ]);

}());
