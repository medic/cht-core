(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('DeleteUserCtrl',
    function (
      $log,
      $rootScope,
      $scope,
      $translate,
      $uibModalInstance,
      DeleteUser,
      model,
      Snackbar
    ) {

      'ngInject';

      $scope.cancel = function() {
        $uibModalInstance.dismiss('cancel');
      };

      $scope.ok = function() {
        DeleteUser(model)
          .then(function() {
            $rootScope.$broadcast('UsersUpdated');
            $uibModalInstance.close('ok');
            $translate('document.deleted').then(Snackbar);
          })
          .catch(function(err) {
            $log.error('Error deleting user', err);
            $translate('Error deleting document').then(Snackbar);
          });
      };

    }
  );

}());