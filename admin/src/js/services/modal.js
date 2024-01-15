/**
 * Service to start modals.
 *
 * Takes an object as a parameter with the properties:
 * - templateUrl    (String) The URL of the template to render
 * - controller     (String) The name of the controller to invoke
 * - model          (Object) (optional) The object to bind to the $scope
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

    const instanceCache = {};

    const getScope = function(model) {
      const scope = $rootScope.$new();
      scope.model = model;
      scope.status = {
        processing: false,
        error: false
      };
      scope.setProcessing = function() {
        scope.status.processing = true;
        scope.status.error = false;
        scope.status.severity = false;
      };
      scope.setFinished = function() {
        scope.status.processing = false;
        scope.status.error = false;
        scope.status.severity = false;
      };
      scope.setError = function(err, message, severity) {
        $log.error('Error submitting modal', err);
        scope.status.processing = false;
        scope.status.error = message;
        scope.status.severity = severity;
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
      options.scope = getScope(options.model);

      if (!instanceCache[options.templateUrl]) {
        const instance = $uibModal.open(options);
        instance.closed.then(() => delete instanceCache[options.templateUrl]);
        instanceCache[options.templateUrl] = instance;
      }

      return instanceCache[options.templateUrl].result;
    };
  });
