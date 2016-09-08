var _ = require('underscore'),
    moment = require('moment');

(function () {

  'use strict';

  var module = angular.module('inboxFilters');

  var getAbsoluteDateString = function(date, options) {
    if (options.withoutTime) {
      return options.FormatDate.date(date);
    }
    return options.FormatDate.datetime(date);
  };

  var getRelativeDateString = function(date, options) {
    if (options.age) {
      return options.FormatDate.age(date);
    }
    return options.FormatDate.relative(date, options);
  };

  var getRelativeDate = function(date, options) {
    options = options || {};
    _.defaults(options, { prefix: '', suffix: '' });
    if (!date) {
      return '<span>' + options.prefix + options.suffix + '</span>';
    }
    var momentDate = moment(date);
    var absolute = getAbsoluteDateString(momentDate, options);
    var relative = getRelativeDateString(momentDate, options);
    var classes = ['relative-date'];
    var now = moment();
    if (options.withoutTime) {
      now = now.startOf('day');
    }
    if (momentDate.isBefore(now)) {
      classes.push('past');
    } else {
      classes.push('future');
    }
    return options.prefix +
           '<span class="' + classes.join(' ') + '" title="' + absolute + '">' +
             '<span class="relative-date-content">' + relative + '</span>' +
           '</span>' +
           options.suffix;
  };

  var getTaskDate = function(task) {
    if (task.state === 'scheduled') {
      return task.due;
    }
    if (task.state_history && task.state_history.length) {
      return task.state_history[task.state_history.length - 1].timestamp;
    }
    return task.due || task.reported_date;
  };

  var getState = function(state, translate) {
    return '<span class="state ' + state + '">' + translate('state.' + state) + '</span>';
  };

  module.filter('autoreply', ['FormatDate', 'translateFilter',
    function (FormatDate, translateFilter) {
      return function (task) {
        if (!task || !task.state) {
          return '';
        }
        var content = getState(task.state, translateFilter) + '&nbsp;' +
          '<span class="autoreply" title="' + task.messages[0].message + '">' +
            '<span class="autoreply-content">' + translateFilter('autoreply') + '</span>' +
          '</span>&nbsp';
        return getRelativeDate(getTaskDate(task), {
          FormatDate: FormatDate,
          prefix: content
        });
      };
    }
  ]);

  var getRecipient = function(task, translateFilter) {
    if (task && task.messages && task.messages.length && task.messages[0].to) {
      return '<span class="recipient">&nbsp;' +
               translateFilter('to recipient', { recipient: task.messages[0].to }) +
             '</span>';
    }
    return '';
  };

  module.filter('state', ['FormatDate', 'translateFilter',
    function (FormatDate, translateFilter) {
      return function (task) {
        if (!task) {
          return '';
        }
        return getRelativeDate(getTaskDate(task), {
          FormatDate: FormatDate,
          prefix: getState(task.state || 'received', translateFilter) + '&nbsp;',
          suffix: getRecipient(task, translateFilter)
        });
      };
    }
  ]);

  module.filter('age', ['FormatDate',
    function (FormatDate) {
      return function (date) {
        return getRelativeDate(date, {
          FormatDate: FormatDate,
          withoutTime: true,
          age: true
        });
      };
    }
  ]);

  module.filter('relativeDate', ['FormatDate',
    function (FormatDate) {
      return function (date) {
        return getRelativeDate(date, { FormatDate: FormatDate });
      };
    }
  ]);

  module.filter('relativeDay', ['FormatDate',
    function (FormatDate) {
      return function (date) {
        return getRelativeDate(date, {
          FormatDate: FormatDate,
          withoutTime: true
        });
      };
    }
  ]);

  module.filter('simpleDate', ['FormatDate',
    function (FormatDate) {
      return function (date) {
        return FormatDate.date(date);
      };
    }
  ]);

  module.filter('simpleDateTime', ['FormatDate',
    function (FormatDate) {
      return function (date) {
        return FormatDate.datetime(date);
      };
    }
  ]);

  module.filter('fullDate', ['FormatDate',
    function (FormatDate) {
      return function (date) {
        if (!date) {
          return '';
        }
        return '<div class="relative-date-content">' + FormatDate.relative(date) + '</div>' +
               '<div class="full-date">' + FormatDate.datetime(date) + '</div>';
      };
    }
  ]);

  module.filter('weeksPregnant', ['FormatDate',
    function () {
      return function (weeks) {
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
    }
  ]);

}());
