(function () {

  'use strict';

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

  angular.module('inboxControllers').controller('ErrorCtrl',
    function (
      $scope,
      $stateParams
    ) {
      'ngInject';
      $scope.error = errors[$stateParams.code] || errors['404'];
    }
  );

}());
