/**
 * Directive for boilerplate for fullscreen window views.
 *
 * Usage:
 * <fullscreen-window [attributes]>[window body]</fullscreen-window>
 */
angular.module('directives').directive('fullscreenWindow', function() {
  'use strict';
  return {
    restrict: 'E',
    transclude: true,
    templateUrl: 'templates/fullscreen_window.html',
    scope: {

      // string: (optional)  window element id
      id: '=',

      // string: the translation key to use for the title of the window
      titleKey: '=',

      // boolean: (optional) specify the visibility of the close button on top of window (defaults to false)
      showCloseButton: '=',

      // function: to be called when dismissing the window
      onCancel: '&'

    }
  };
});
