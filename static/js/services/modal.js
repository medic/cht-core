/**
 * Service to start modals.
 *
 * Modal({
 *  templateUrl: templateUrlVal, // the template to render
 *   controller: controllerName, // the controller to invoke
 *   model: {}  // optional - bound to $scope.model
 * }).then(function() {
 *   // User confirmed!
 *   doHappyThings();
 * }).catch(function() {
 *   // User rejected :(
 *   doMessedUpThings();
 * });
 *
 * In the modal template use the mm-modal directive to provide
 * the modal boilerplate.
 *
 * The controller is invoked with a scope that contains:
 * - model: the given model
 * - setProcessing(): a function to style the modal as processing
 * - setFinished(): a function to style the modal as finished processing
 * - setError(err, message): a function to log the err and translate and
 *       display the message
 */
angular.module('inboxServices').factory('Modal',
  function(
    $log,
    $q,
    $rootScope,
    $uibModal
  ) {
    'use strict';
    'ngInject';

    var getScope = function(model) {
      var scope = $rootScope.$new();
      scope.model = model;
      scope.status = {
        processing: false,
        error: false
      };
      scope.setProcessing = function() {
        scope.status.processing = true;
        scope.status.error = false;
      };
      scope.setFinished = function() {
        scope.status.processing = false;
        scope.status.error = false;
      };
      scope.setError = function(err, message) {
        $log.error('Error submitting modal', err);
        scope.status.processing = false;
        scope.status.error = message;
      };
      return scope;
    };

    return function(options) {
      if (!options.templateUrl) {
        return $q.reject('No templateUrl speficied.');
      }
      if (!options.controller) {
        return $q.reject('No controller speficied.');
      }
      return $uibModal.open({
        scope: getScope(options.model),
        templateUrl: options.templateUrl,
        controller: options.controller
      }).result;
    };
  }
);
