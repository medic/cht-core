(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  inboxServices.factory('Modal', ['$uibModal',
    function($uibModal) {
      return function(templateUrl, input) {
        var modalInstance = $uibModal.open({
          templateUrl: templateUrl,
          controller: 'ModalCtrl',
          resolve: {
            input: function () {
              return input;
            }
          }
        });
        return modalInstance.result;
      };
    }
  ]);

}());
