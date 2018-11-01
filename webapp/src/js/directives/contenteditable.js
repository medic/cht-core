/**
 * Make a div element editable in place using the HTML5 contenteditable attribute
 *
 * Usage:
 * <div contenteditable ng-model="..."
 */
angular.module('inboxDirectives').directive('contenteditable', function() {
  'use strict';
  return {
    restrict: 'A',
    require: 'ngModel',
    link: function(scope, element, attrs, ngModel) {

      function read() {
        var html = element.html();
        ngModel.$setViewValue(angular.element('<div>' + html + '</div>').text());
      }

      ngModel.$render = function() {
        element.html(ngModel.$viewValue || '');
      };

      element.bind('blur keyup change', function() {
        scope.$apply(read);
      });
    }
  };
});
