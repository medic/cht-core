(function () {

  'use strict';

  const errors = {
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
      $stateParams
    ) {
      'ngInject';
      this.error = errors[$stateParams.code] || errors['404'];
    }
  );

}());
