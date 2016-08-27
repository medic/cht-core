(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  var errors = {
    403: {
      title: 'error.403.title',
      description: 'error.403.description'
    },
    404: {
      title: 'error.404.title',
      description: 'error.404.description'
    }
  };

  inboxControllers.controller('ErrorCtrl',
    ['$scope', '$stateParams',
    function ($scope, $stateParams) {
      $scope.error = errors[$stateParams.code] || errors['404'];
    }
  ]);

}());