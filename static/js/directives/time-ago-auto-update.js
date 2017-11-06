var moment = require('moment');

/**
 * Directive for an auto-updating relative time ago date.
 * Relies on something else to auto-update its contents.
 * Does not auto-update itself for performance reasons.
 */
angular.module('inboxDirectives').directive('timeAgoAutoUpdate',
  function($interval, FormatDate, RenderDate) {
    'use strict';
    'ngInject';

    function link(scope) {
      var momentDate = moment(scope.date);
      var options = { FormatDate: FormatDate };

      scope.unixDate = momentDate.valueOf();
      scope.text = RenderDate.getRelativeDateString(momentDate, options);
    }

    return {
      link: link,
      restrict: 'E',
      scope: {
        // Boolean: (optional).
        age: '=',
        // String: (required).
        date: '=',
        // String.
        text: '@',
        // Number.
        unixDate: '@',
        // Boolean: (optional).
        withoutTime: '=',
      },
      // data-date is needed for dom-mutating functions to pick it up.
      template: '<span data-date="{{unixDate}}">{{ text }}</span>',
    };
  }
);
