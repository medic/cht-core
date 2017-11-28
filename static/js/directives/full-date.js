/**
 * Is responsible for rendering the full date.
 */
angular.module('inboxDirectives').directive('fullDate',
  function(FormatDate) {
    'use strict';
    'ngInject';

    function link(scope) {
      scope.fullDate = FormatDate.datetime(scope.date);
    }

    return {
      link: link,
      restrict: 'E',
      templateUrl: 'templates/directives/full-date.html',
      scope: {
        // String: (optional) date to be displayed and auto-updated.
        date: '=',
        // String.
        fullDate: '@',
      }
    };
  }
);
