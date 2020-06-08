const moment = require('moment');

(function () {

  'use strict';

  const getAbsoluteDateString = function(date, options) {
    if (options.withoutTime) {
      return options.FormatDate.date(date);
    }
    return options.FormatDate.datetime(date);
  };

  const getRelativeDate = function(date, options) {
    options = Object.assign({ prefix: '', suffix: '', absoluteToday: true }, options);

    if (!date) {
      if (options.raw) {
        return;
      }
      return `<span>${options.prefix}${options.suffix}</span>`;
    }

    const momentDate = moment(date);
    const relative = options.RelativeDate.getRelativeDate(momentDate, options);

    if (options.raw) {
      return relative;
    }

    const classes = ['relative-date'];
    const absolute = getAbsoluteDateString(momentDate, options);

    let now = moment();

    if (options.withoutTime) {
      now = now.startOf('day');
    }

    if (momentDate.isBefore(now)) {
      classes.push('past');
    } else {
      classes.push('future');
    }

    if (options.age) {
      classes.push('age');
    }

    const relativeDateClass = options.RelativeDate.getCssSelector();
    const dataSet = options.RelativeDate.generateDataset(date, options);

    return `${options.prefix}<span class="${classes.join(' ')}" title="${absolute}">` +
      `<span class="relative-date-content ${relativeDateClass}" ${dataSet}>${relative}</span>` +
      `</span>${options.suffix}`;
  };

  const getTaskDate = function(task) {
    const current = task.state_history &&
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

  const getState = function(state, $translate) {
    const label = $translate.instant('state.' + state);
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
      const content = getState(task.state, $translate) + '&nbsp;' +
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

  const getRecipient = function(task, $translate) {
    const recipient = task && task.messages && task.messages.length && task.messages[0].to;
    if (recipient) {
      const label = $translate.instant('to recipient', { recipient: recipient });
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
        withoutTime: true,
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
      const options = {
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
      const options = {
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

  angular.module('inboxFilters').filter('taskDueDate', function(
    $sce,
    FormatDate,
    RelativeDate
  ) {
    'ngInject';
    return function(date) {
      return $sce.trustAsHtml(getRelativeDate(date, {
        FormatDate: FormatDate,
        RelativeDate: RelativeDate,
        withoutTime: true,
        task: true
      }));
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
      const cssSelector = RelativeDate.getCssSelector();
      const dataset = RelativeDate.generateDataset(date);
      const relative = FormatDate.relative(date);
      const absolute = FormatDate.datetime(date);
      return $sce.trustAsHtml(
        `<div class="relative-date-content ${cssSelector}" ${dataset}>${relative}</div>` +
        `<div class="full-date">${absolute}</div>`
      );
    };
  });

  angular.module('inboxFilters').filter('weeksPregnant', function() {
    return function(weeks) {
      if (!weeks || !weeks.number) {
        return '';
      }
      const classes = [];
      if (weeks.number >= 37) {
        classes.push('upcoming-edd');
      }
      if (weeks.approximate) {
        classes.push('approximate');
      }
      const attr = classes.length ? ' class="weeks-pregnant ' + classes.join(' ') + '"' : '';
      return `<span${attr}>${weeks.number}</span>`;
    };
  });

}());
