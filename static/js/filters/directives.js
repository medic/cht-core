(function () {

  'use strict';

  var module = angular.module('inboxFilters');

  module.directive('mmSender', function() {
    return {
      restrict: 'E',
      scope: { message: '=' },
      templateUrl: 'templates/partials/sender.html'
    };
  });

}());