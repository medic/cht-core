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
    var current = task.state_history &&
                  task.state_history.length &&
                  task.state_history[task.state_history.length - 1];
    if (current) {
      if (current.state === 'scheduled') {
        return task.due;
      }
      return current.timestamp;
    }
    return task.due || task.reported_date;
  };

  var getState = function(state, $translate) {
    var label = $translate.instant('state.' + state);
    return '<span class="state ' + state + '">' + label + '</span>';
  };

  module.filter('autoreply', function(FormatDate, $translate) {
    'ngInject';
    return function (task) {
      if (!task || !task.state) {
        return '';
      }
      var content = getState(task.state, $translate) + '&nbsp;' +
        '<span class="autoreply" title="' + task.messages[0].message + '">' +
          '<span class="autoreply-content">' + $translate.instant('autoreply') + '</span>' +
        '</span>&nbsp';
      return getRelativeDate(getTaskDate(task), {
        FormatDate: FormatDate,
        prefix: content
      });
    };
  });

  var getRecipient = function(task, $translate) {
    var recipient = task && task.messages && task.messages.length && task.messages[0].to;
    if (recipient) {
      var label = $translate.instant('to recipient', { recipient: recipient });
      return '<span class="recipient">&nbsp;' + label + '</span>';
    }
    return '';
  };

  module.filter('state', function(FormatDate, $translate) {
    'ngInject';
    return function (task) {
      if (!task) {
        return '';
      }
      return getRelativeDate(getTaskDate(task), {
        FormatDate: FormatDate,
        prefix: getState(task.state || 'received', $translate) + '&nbsp;',
        suffix: getRecipient(task, $translate)
      });
    };
  });

  module.filter('age', function(FormatDate) {
    'ngInject';
    return function (date) {
      return getRelativeDate(date, {
        FormatDate: FormatDate,
        withoutTime: true,
        age: true
      });
    };
  });

  module.filter('relativeDate', function(FormatDate) {
    'ngInject';
    return function (date) {
      return getRelativeDate(date, { FormatDate: FormatDate });
    };
  });

  module.filter('relativeDay', function(FormatDate) {
    'ngInject';
    return function (date) {
      return getRelativeDate(date, {
        FormatDate: FormatDate,
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

  module.filter('fullDate', function(FormatDate) {
    return function (date) {
      if (!date) {
        return '';
      }
      return '<div class="relative-date-content">' + FormatDate.relative(date) + '</div>' +
             '<div class="full-date">' + FormatDate.datetime(date) + '</div>';
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
