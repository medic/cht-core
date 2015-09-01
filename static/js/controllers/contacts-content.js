(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('ContactsContentCtrl', 
    ['$scope', '$stateParams',
    function ($scope, $stateParams) {

      if ($stateParams.id) {
        $scope.selectContact($stateParams.id);
      } else {
        $scope.clearSelected();
      }

      $scope.$on('ContactUpdated', function(e, contact) {
        if (!contact) {
          $scope.select();
        } else if(contact._deleted &&
            $scope.selected &&
            $scope.selected._id === contact._id) {
          $scope.clearSelected();
        } else if ($scope.selected && $scope.selected._id === contact._id) {
          $scope.selectContact(contact._id);
        }
      });

    }
  ]);

}());
