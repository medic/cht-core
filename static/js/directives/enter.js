/**
 * Directive to detect enter key
 * */
angular.module('inboxDirectives').directive('ngEnter', function($document) {
  'use strict';
  return {
    restrict: 'A',
    link: function(scope, elem, attrs) {
      var keydownEvent = function(event) {
        if (event.which === 13) {
          scope.$eval(attrs.ngEnter);
          event.preventDefault();
          $document.unbind('keydown keypress', keydownEvent);
        }
      };
      $document.bind('keydown keypress', keydownEvent);
    }
  };
});
