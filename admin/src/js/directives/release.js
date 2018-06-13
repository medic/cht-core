angular.module('directives').directive('release', function() {
  'use strict';

  return {
    restrict: 'E',
    templateUrl: 'templates/release.html',
    scope: {
      dateFormat: '@',
      release: '=',
      potentiallyIncompatible: '=',
      upgrade: '=',
    }
  };
});
