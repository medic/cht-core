/**
 * Service to start modals.
 *
 * Modal({
 *  templateUrl: templateUrlVal,
 *   controller: controllerName,
 *   model: {}  // optional
 * }).then(function() {
 *   // User confirmed!
 *   doHappyThings();
 * }).catch(function() {
 *   // User rejected :(
 *   doMessedUpThings();
 * });
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

    var getScope = function(options) {
      var scope = $rootScope.$new();
      scope.model = options.model;
      scope.processing = false;
      scope.error = false;
      scope.setProcessing = function() {
        scope.processing = true;
        scope.error = false;
      };
      scope.setFinished = function() {
        scope.processing = false;
        scope.error = false;
      };
      scope.setError = function(err, message) {
        $log.error('Error submitting modal', err);
        scope.processing = false;
        scope.error = message;
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
        scope: getScope(options),
        templateUrl: options.templateUrl,
        controller: options.controller
      }).result;
    };
  }
);
