var _ = require('underscore'),
    moment = require('moment');

(function () {

  'use strict';

  var getAbsoluteDateString = function(date, options) {
    if (options.withoutTime) {
      return options.FormatDate.date(date);
    }
    return options.FormatDate.datetime(date);
  };

  var getRelativeDateString = function(date, options) {
    if (options.age) {
      return options.FormatDate.age(date, options);
    } else if (!options.withoutTime && moment(date).isSame(moment(), 'day')) {
      return options.FormatDate.time(date);
    } else {
      return options.FormatDate.relative(date, options);
    }
  };

  var getRelativeDate = function(date, options) {
    options = options || {};
    _.defaults(options, { prefix: '', suffix: '' });

    if (!date) {
      if (options.raw) {
        return;
      } else {
        return '<span>' + options.prefix + options.suffix + '</span>';
      }
    }

    var momentDate = moment(date);
    var relative = getRelativeDateString(momentDate, options);

    if (options.raw) {
      return relative;
    }

    var classes = ['relative-date'];
    var absolute = getAbsoluteDateString(momentDate, options);

    var now = moment();

    if (options.withoutTime) {
      now = now.startOf('day');
    }

    if (momentDate.isBefore(now)) {
      classes.push('past');
    } else {
      classes.push('future');
    }

    if(options.age){
      classes.push('age');
    }

    return options.prefix +
           '<span class="' + classes.join(' ') + '" title="' + absolute + '">' +
             '<span ' +
               'class="relative-date-content '+ options.RelativeDate.getCssSelector() +'" ' +
                options.RelativeDate.generateDataset(date, options, true) +
             '>' +
                relative +
             '</span>' +
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

  angular.module('inboxFilters').filter('autoreply', function(
    $sce,
    $translate,
    FormatDate,
    RelativeDate
  ) {
    'ngInject';
    return function (task) {
      if (!task || !task.state) {
        return '';
      }
      var content = getState(task.state, $translate) + '&nbsp;' +
        '<span class="autoreply" title="' + task.messages[0].message + '">' +
          '<span class="autoreply-content">' + $translate.instant('autoreply') + '</span>' +
        '</span>&nbsp';
      return $sce.trustAsHtml(getRelativeDate(getTaskDate(task), {
        FormatDate: FormatDate,
        RelativeDate: RelativeDate,
        prefix: content,
      }));
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

  angular.module('inboxFilters').filter('state', function(
    $sce,
    $translate,
    FormatDate,
    RelativeDate
  ) {
    'ngInject';
    return function (task) {
      if (!task) {
        return '';
      }
      return $sce.trustAsHtml(getRelativeDate(getTaskDate(task), {
        FormatDate: FormatDate,
        RelativeDate: RelativeDate,
        prefix: getState(task.state || 'received', $translate) + '&nbsp;',
        suffix: getRecipient(task, $translate),
      }));
    };
  });

  angular.module('inboxFilters').filter('dateOfDeath', function(
    $sce,
    $translate,
    FormatDate,
    RelativeDate
  ) {
    'ngInject';
    return function (dod) {
      if (!dod) {
        return '';
      }
      return $sce.trustAsHtml(getRelativeDate(dod, {
        FormatDate: FormatDate,
        RelativeDate: RelativeDate,
        prefix: $translate.instant('contact.deceased.date.prefix') + '&nbsp;'
      }));
    };
  });

  angular.module('inboxFilters').filter('age', function(
    $sce,
    FormatDate,
    RelativeDate
  ) {
    'ngInject';
    return function (dob, dod) {
      return $sce.trustAsHtml(getRelativeDate(dob, {
        FormatDate: FormatDate,
        RelativeDate: RelativeDate,
        withoutTime: true,
        age: true,
        end: dod
      }));
    };
  });

  angular.module('inboxFilters').filter('dayMonth', function() {
    'ngInject';
    return function (date) {
      return '<span>' + moment(date).format('D MMM') + '</span>';
    };
  });

  angular.module('inboxFilters').filter('relativeDate', function(
    $sce,
    FormatDate,
    RelativeDate
  ) {
    'ngInject';
    return function (date, raw) {
      var options = {
        FormatDate: FormatDate,
        RelativeDate: RelativeDate
      };

      if (raw) {
        options.raw = true;
        return getRelativeDate(date, options);
      } else {
        return $sce.trustAsHtml(getRelativeDate(date, options));
      }
    };
  });

  angular.module('inboxFilters').filter('relativeDay', function(
    $sce,
    FormatDate,
    RelativeDate
  ) {
    'ngInject';
    return function (date, raw) {
      var options = {
        FormatDate: FormatDate,
        RelativeDate: RelativeDate,
        withoutTime: true
      };

      if (raw) {
        options.raw = true;
        return getRelativeDate(date, options);
      } else {
        return $sce.trustAsHtml(getRelativeDate(date, options));
      }
    };
  });

  angular.module('inboxFilters').filter('simpleDate', function(FormatDate) {
    return function (date) {
      return FormatDate.date(date);
    };
  });

  angular.module('inboxFilters').filter('simpleDateTime', function(FormatDate) {
    return function (date) {
      return FormatDate.datetime(date);
    };
  });

  angular.module('inboxFilters').filter('fullDate', function(
    $sce,
    FormatDate,
    RelativeDate
  ) {
    return function (date) {
      if (!date) {
        return '';
      }
      var result = '<div ' +
                      'class="relative-date-content '+ RelativeDate.getCssSelector() +'" ' +
                      RelativeDate.generateDataset(date) +
                   '>' +
                      FormatDate.relative(date) +
                   '</div>' +
                   '<div class="full-date">' + FormatDate.datetime(date) + '</div>';

      return $sce.trustAsHtml(result);
    };
  });

  angular.module('inboxFilters').filter('weeksPregnant', function() {
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
