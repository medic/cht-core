angular.module('inboxDirectives').directive('mmSender', function() {
  'use strict';
  return {
    restrict: 'E',
    scope: { message: '=', sentBy: '=', hideLineage: '=' },
    templateUrl: 'templates/directives/sender.html'
  };
});
