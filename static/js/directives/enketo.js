/**
 * Directive for boilerplate for enketo forms
 *
 * Usage:
 * <mm-enketo [attributes] />
 */
angular.module('inboxDirectives').directive('mmEnketo', function() {
  'use strict';
  return {
    restrict: 'E',
    templateUrl: 'templates/directives/enketo.html',
    scope: {
      // string: (optional) modal element id
      id: '=',

      // string: (optional) data to enclude in the data-editing attribute
      editing: '=',

      // object: object with 'saving', and 'error' properties to update form status
      status: '=',

      // function: to be called when cancelling out of the form
      onCancel: '&',

      // function: to be called when submitting the form
      onSubmit: '&'
    }
  };
});
