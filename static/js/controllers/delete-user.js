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
        $scope.processing = true;
        $scope.error = false;
        DeleteUser(model)
          .then(function() {
            $scope.processing = false;
            $rootScope.$broadcast('UsersUpdated');
            $uibModalInstance.close('ok');
            $translate('document.deleted').then(Snackbar);
          })
          .catch(function(err) {
            $scope.processing = false;
            $scope.error = true;
            $log.error('Error deleting user', err);
          });
      };

    }
  );

}());