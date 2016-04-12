/**
 * Controller for all modals. To create modals, do not use this directly, use the Modal service.
 */
angular.module('inboxControllers').controller('ModalCtrl',
  ['$log', 'processingFunction', '$scope', '$uibModalInstance',
  function($log, processingFunction, $scope, $uibModalInstance) {
    $scope.processing = false;
    $scope.error = false;

    $scope.setProcessingMode = function() {
      $scope.processing = true;
      $scope.error = false;

      if (processingFunction) {
        var result = processingFunction();
        if (result && result.then) {
          // It's a promise!
          result
            .then(function() {
              $scope.ok();
            })
            .catch(function(err) {
              _setErrorMode(err);
            });
          return;
        }

        // Simple true/false result.
        if (result) {
          $scope.ok();
        } else {
          _setErrorMode();
        }
      }
    };

    var _setErrorMode = function(err) {
      $log.error('Error in modal', err);
      $scope.processing = false;
      $scope.error = true;
    };

    $scope.ok = function() {
      $uibModalInstance.close('ok');
    };

    $scope.cancel = function() {
      $uibModalInstance.dismiss('cancel');
    };
  }
]);
