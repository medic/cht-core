var _ = require('underscore');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  /**
   * Service to start modals.
   *
   * Modal({
   *  templateUrl: templateUrlVal,
   *   controller: controllerName,
   *   args: {  // optional
   *     someInput: value,
   *     someFunctionTheModalNeeds: theFunction
   *   }
   * }).then(function () {
   *   // User confirmed!
   *   doHappyThings();
   * }, function () {
   *   // User rejected :(
   *   doMessedUpThings();
   * });
   */
  inboxServices.factory('Modal', ['$uibModal',
    function($uibModal) {
      return function(options) {
        var formattedOptions = {};
        if (!options.templateUrl) {
          return Promise.reject('No templateUrl speficied.');
        }
        formattedOptions.templateUrl = options.templateUrl;
        if (!options.controller) {
          return Promise.reject('No controller speficied.');
        }
        formattedOptions.controller = options.controller;
        if (options.args) {
          // Transform to the appropriate but weird syntax for passing args.
          formattedOptions.resolve = {};
          _.each(options.args, function(val, key) {
            formattedOptions.resolve[key] = function() { return val; };
          });
        }

        var modalInstance = $uibModal.open(formattedOptions);
        return modalInstance.result;
      };
    }
  ]);
}());
