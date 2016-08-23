angular.module('inboxDirectives').directive('mmModal', function() {
  'use strict';
  return {
    restrict: 'E',
    transclude: true,
    templateUrl: 'templates/directives/modal.html',
    scope: {
      id: '=',
      danger: '=',
      titleKey: '=',
      submitKey: '=',
      submittingKey: '=',
      onCancel: '&',
      onSubmit: '&'
    }
  };
});
