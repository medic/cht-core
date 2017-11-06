var _ = require('underscore'),
  moment = require('moment');

(function () {
  'use strict';

  var module = angular.module('inboxFilters');

  var getRelativeDate = function(date, options) {
    options = options || {};
    _.defaults(options, { prefix: '', suffix: '' });

    if (!date) {
      return '<span></span>';
    }

    var momentDate = moment(date);

    var absolute = options.RenderDate
      .getAbsoluteDateString(momentDate, options);
    var relative = options.RenderDate
      .getRelativeDateString(momentDate, options);
    var classes = options.RenderDate
      .getRelativeDateClasses(momentDate, options);

    return '<span class="' + classes.join(' ') + '" title="' + absolute + '">' +
             '<span class="relative-date-content">' + relative + '</span>' +
           '</span>';
  };

  module.filter('age', function(FormatDate, RenderDate) {
    'ngInject';
    return function (date) {
      return getRelativeDate(date, {
        FormatDate: FormatDate,
        RenderDate: RenderDate,
        withoutTime: true,
        age: true
      });
    };
  });

  module.filter('dayMonth', function() {
    'ngInject';
    return function (date) {
      return '<span>' + moment(date).format('D MMM') + '</span>';
    };
  });

  module.filter('relativeDate', function(FormatDate, RenderDate) {
    'ngInject';
    return function (date) {
      return getRelativeDate(date, {
        FormatDate: FormatDate,
        RenderDate: RenderDate,
      });
    };
  });

  module.filter('relativeDay', function(FormatDate, RenderDate) {
    'ngInject';
    return function (date) {
      return getRelativeDate(date, {
        FormatDate: FormatDate,
        RenderDate: RenderDate,
        withoutTime: true
      });
    };
});

  module.filter('simpleDate', function(FormatDate) {
    return function (date) {
      return FormatDate.date(date);
    };
  });

  module.filter('simpleDateTime', function(FormatDate) {
    return function (date) {
      return FormatDate.datetime(date);
    };
  });

  module.filter('weeksPregnant', function() {
    return function(weeks) {
      if (!weeks || !weeks.number) {
        return '';
      }
      var classes = [];
      if (weeks.number >= 37) {
        classes.push('upcoming-edd');
      }
      if (weeks.approximate) {
        classes.push('approximate');
      }
      var attr = classes.length ? ' class="' + classes.join(' ') + '"' : '';
      return '<span' + attr + '>' + weeks.number + '</span>';
    };
  });

}());
