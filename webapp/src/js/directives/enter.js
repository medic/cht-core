/**
 * Directive to detect enter key
 * */
angular.module('inboxDirectives').directive('mmEnter', function($document) {
  'use strict';
  return {
    restrict: 'A',
    link: function(scope, elem, attrs) {
      const keydownEvent = function(event) {
        if (event.which === 13) {
          scope.$eval(attrs.mmEnter);
          event.preventDefault();
          $document.unbind('keydown keypress', keydownEvent);
        }
      };
      $document.bind('keydown keypress', keydownEvent);
      scope.$on('$destroy', function() {
        $document.unbind('keydown keypress', keydownEvent);
      });
    }
  };
});
