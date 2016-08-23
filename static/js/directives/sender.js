angular.module('inboxDirectives').directive('mmSender', function() {
  'use strict';
  return {
    restrict: 'E',
    scope: { message: '=' },
    templateUrl: 'templates/directives/sender.html'
  };
});
