var moment = require('moment');

(function () {

  'use strict';

  var module = angular.module('inboxFilters');

  var getRelativeDate = function(date, format, content) {
    content = content || '';
    if (!date) {
      return '<div>' + content + '</div>';
    }
    var m = moment(date);
    return  '<div class="relative-date" title="' + m.format(format) + '">' +
              content + 
              '<span class="relative-date-content">' + m.fromNow() + '</span>' +
            '</div>';
  };

  var getTaskDate = function(task) {
    if (task.state === 'scheduled') {
      return task.due;
    }
    if (task.state_history && task.state_history.length) {
      return task.state_history[task.state_history.length - 1].timestamp;
    }
    return task.due;
  };

  module.filter('state', ['RememberService',
    function (RememberService) {
      return function (task) {
        if (!task || !task.state) {
          return '';
        }
        var content = '<span class="state">' + task.state + '</span>';
        return getRelativeDate(
          getTaskDate(task), RememberService.dateFormat, content
        );
      };
    }
  ]);

  module.filter('relativeDate', ['RememberService',
    function (RememberService) {
      return function (date) {
        return getRelativeDate(date, RememberService.dateFormat);
      };
    }
  ]);

  module.filter('fullDate', ['RememberService',
    function (RememberService) {
      return function (date) {
        if (!date) {
          return '';
        }
        var m = moment(date);
        return  '<div class="relative-date-content">' + m.fromNow() + '</div>' +
                '<div class="full-date">' + m.format(RememberService.dateFormat) + '</div>';
      };
    }
  ]);

}());