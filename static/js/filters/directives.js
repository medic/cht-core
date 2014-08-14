(function () {

  'use strict';

  var module = angular.module('inboxFilters');

  module.directive('scroller', ['$timeout', 'RememberService', 
    function($timeout, RememberService) {
      return {
        restrict: 'A',
        scope: {},
        link: function(scope, elm) {
          var raw = elm[0];
          
          elm.bind('scroll', function() {
            RememberService.scrollTop = raw.scrollTop;
          });

          $timeout(function() {
            raw.scrollTop = RememberService.scrollTop;
          });
        }
      };
    }
  ]);

  module.directive('mmSender', function() {
    return {
      restrict: 'E',
      scope: { message: '=' },
      templateUrl: '/partials/sender.html'
    };
  });

}());