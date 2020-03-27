/**
 * Directive for boilerplate for modal dialog boxes.
 *
 * Usage:
 * <mm-modal [attributes]>[modal body]</mm-modal>
 */
angular.module('inboxDirectives').directive('mmModal', function() {
  'use strict';
  return {
    restrict: 'E',
    transclude: true,
    templateUrl: 'templates/directives/modal.html',
    scope: {
      // object: (required) the status object for marking errors and processing.
      // If using the modal service just pass `status="status"`
      status: '=',

      // string: (optional) modal element id
      id: '=',

      // boolean: (optional) whether the modal should look scary or not (defaults to false)
      danger: '=',

      // string: the translation key to use for the title of the modal
      titleKey: '=',

      // string: the translation key to use for the submit button
      submitKey: '=',

      // string: (optional) the key to use for the submit button when processing
      submittingKey: '=',

      // string: (optional) the key to use for the cancel button (defaults to 'Cancel')
      cancelKey: '=',

      // function: to be called when dismissing the modal
      onCancel: '&',

      // function: to be called when submitting the modal
      onSubmit: '&',

      // string: (optional) the expression which, if true, will disable the submit button
      disableSubmit: '='
    }
  };
});
