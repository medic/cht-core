/**
 * Directive for boilerplate for modal dialog boxes.
 *
 * Usage:
 * <mm-modal [attributes]>[modal body]</mm-modal>
 */
angular.module('directives').directive('mmModal', function() {
  'use strict';
  return {
    restrict: 'E',
    transclude: true,
    templateUrl: 'templates/modal.html',
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

      // Object: the parameters used for title translation
      titleParams: '=',

      // string: the translation key to use for the submit button
      submitKey: '=',

      // string: (optional) the key to use for the submit button when processing
      submittingKey: '=',

      // string: (optional) the key to use for the cancel button (defaults to 'Cancel')
      cancelKey: '=',

      // string: (optional) the key to use for the delete button (defaults to 'Delete')
      deleteKey: '=',

      // function: to be called when dismissing the modal
      onCancel: '&',

      // function: to be called when submitting the modal
      onSubmit: '&',

      // function: to be called when deleting the modal
      onDelete: '&',

      // string: (optional) the expression which, if true, will disable the submit button
      disableSubmit: '=',

      // string: (optional) the expression which, if true, will show the delete button
      showDelete: '=',
    }
  };
});
