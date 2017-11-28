var moment = require('moment');

/**
 * Is responsible for rendering relative time for different use cases.
 */
angular.module('inboxDirectives').directive('relativeDate',
  function(FormatDate, RenderDate) {
    'use strict';

    function link(scope) {
      var options = { FormatDate: FormatDate };

      var momentDate = moment(scope.date);
      var classes = RenderDate.getRelativeDateClasses(momentDate, options);

      scope.classes = classes.join(' ');
      scope.title = RenderDate.getAbsoluteDateString(momentDate, options);
    }

    return {
      link: link,
      restrict: 'E',
      templateUrl: 'templates/directives/relative-date.html',
      scope: {
        // Boolean: (optional).
        age: '=',
        // String.
        classes: '@',
        // String: (optional) date to be displayed and auto-updated.
        date: '=',
        // String.
        title: '@',
        // String: (optional) usage type.
        type: '@',
        // Boolean: (optional).
        withoutTime: '=',
      }
    };
  }
);
