(function () {

  'use strict';

  /**
   * Creates a yes/no modal and gives back the user's decision in promise.
   * The modal's appearance is speficied in a template. See templates/modals for examples.
   * Example :
   *   ConfirmModal('templates/modals/alert.html')
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
   * ConfirmModal('templates/modals/delete_doc_confirm.html', processingFunction)
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
  var inboxServices = angular.module('inboxServices');

  inboxServices.factory('ConfirmModal', ['$uibModal',
    function($uibModal) {
      return function(templateUrl, processingFunction) {
        var modalInstance = $uibModal.open({
          templateUrl: templateUrl,
          controller: 'ConfirmModalCtrl',
          resolve: {
            processingFunction: function () {
              return processingFunction;
            }
          }
        });
        return modalInstance.result;
      };
    }
  ]);
}());
