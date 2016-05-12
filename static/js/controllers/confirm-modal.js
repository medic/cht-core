/**
 * Creates a yes/no modal and gives back the user's decision in promise.
 * The modal's appearance is speficied in a template. See templates/modals for examples.
 * Example :
 *   Modal({
 *           templateUrl: 'templates/modals/alert.html',
 *           controller: 'ConfirModalCtrl'
 *           args: { processingFunction: null }
 *        })
 *       .then(function () {
 *         // Success!
 *         doHappyThings();
 *       }, function () {
 *         // Fail :(
 *         doMessedUpThings();
 *       });
 *
 * Optionally, if you want the modal to trigger some processing, display a
 * wait message, and return or display error when processing is done :
 *
 * var processingFunction = function() {
 *   if (something) {
 *     // processing worked!
 *     return true;
 *   }
 *   // processing failed :(
 *   return false;
 * };
 *
 *   Modal({
 *           templateUrl: 'templates/modals/alert.html',
 *           controller: 'ConfirModalCtrl',
 *           args: { processingFunction: processingFunction }
 *        })
 *   .then(function () {
 *     // Success!
 *     doHappyThings();
 *   }, function () {
 *     // Fail :(
 *     doMessedUpThings();
 *   });
 *
 * The corresponding template should rely on scope variables for proper
 * display : $scope.processing during the wait, $scope.error if processing
 * fails.
 *
 * If the processing is async, your processing function can return a promise :
 *
 * var processingFunction = function() {
 *     var deferred = $q.defer();
 *     if (something) {
 *       return deferred.resolve();
 *     }
 *     deferred.reject('something went wrong');
 *     // Note : This message won't be displayed. Specify the display message
 *     // in the template.
 *     return deferred.promise;
 * };
 */
(function () {

  'use strict';

  angular.module('inboxControllers').controller('ConfirmModalCtrl',
    ['$log', 'processingFunction', '$q', '$scope', '$uibModalInstance',
    function($log, processingFunction, $q, $scope, $uibModalInstance) {
      $scope.processing = false;
      $scope.error = false;

      $scope.setProcessingMode = function() {
        $scope.processing = true;
        $scope.error = false;

        if (processingFunction) {
          var result = processingFunction();
          if (!result) {
            _setErrorMode();
            return;
          }

          if (result.then && typeof result.then === 'function') {
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
        $scope.processing = false;
        $scope.error = false;
        $uibModalInstance.close('ok');
      };

      $scope.cancel = function() {
        $uibModalInstance.dismiss('cancel');
      };
    }
  ]);
}());
