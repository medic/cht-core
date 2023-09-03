const moment = require('moment');

(function () {

  'use strict';

  angular.module('inboxServices').factory('FormatDate',
    function(
      $log,
      $translate,
      MomentLocaleData,
      Settings
    ) {

      'ngInject';

      const config = {
        date: 'DD-MMM-YYYY',
        datetime: 'DD-MMM-YYYY HH:mm:ss',
        time: MomentLocaleData().longDateFormat('LT'),
        taskDayLimit: 4,
        ageBreaks: [
          { unit: 'years', key: { singular: 'y', plural: 'yy' }, min: 1 },
          { unit: 'months', key: { singular: 'M', plural: 'MM' }, min: 1 },
          { unit: 'days', key: { singular: 'd', plural: 'dd' }, min: 0 }
        ]
      };

      Settings()
        .then(function(res) {
          config.date = res.date_format;
          config.datetime = res.reported_date_format;
          if (typeof res.task_day_limit !== 'undefined') {
            config.taskDayLimit = res.task_day_limit;
          }
        })
        .catch(function(err) {
          $log.error('Error fetching settings', err);
        });

      const format = function(date, key) {
        return moment(date).format(config[key]);
      };

      const getDateDiff = function(date, options) {
        let end = options.end ? moment(options.end) : moment(); // default to now
        end = end.startOf('day'); // remove the time component
        for (let i = 0; i < config.ageBreaks.length; i++) {
          const ageBreak = config.ageBreaks[i];
          const diff = date.diff(end, ageBreak.unit);
          if (Math.abs(diff) > ageBreak.min) {
            return { quantity: diff, key: ageBreak.key };
          }
        }
        return { quantity: 0, key: { singular: 'd', plural: 'dd' } };
      };

      const getTaskDueDate = function(given) {
        const date = moment(given).startOf('day');
        const today = moment().startOf('day');
        const diff = date.diff(today, 'days');
        if (diff <= 0) {
          return $translate.instant('task.overdue');
        }
        if (diff <= config.taskDayLimit) {
          return $translate.instant('task.days.left', { DAYS: diff }, 'messageformat');
        }
        return '';
      };

      const relativeDate = function(date, options) {
        const diff = getDateDiff(moment(date).startOf('day'), options);
        if (options.humanize) {
          if (diff.quantity === 0) {
            return $translate.instant('today');
          }
          if (diff.quantity === 1) {
            return $translate.instant('tomorrow');
          }
          if (diff.quantity === -1) {
            return $translate.instant('yesterday');
          }
        }
        const quantity = Math.abs(diff.quantity);
        const key = quantity === 1 ? diff.key.singular : diff.key.plural;
        const output = MomentLocaleData().relativeTime(quantity, true, key);
        if (options.suffix) {
          return MomentLocaleData().pastFuture(diff.quantity, output);
        }
        return output;
      };

      return {
        date: function(date) {
          return format(date, 'date');
        },
        datetime: function(date) {
          return format(date, 'datetime');
        },
        relative: function(date, options) {
          options = options || {};
          if (options.task) {
            return getTaskDueDate(date);
          }
          if (options.withoutTime) {
            return relativeDate(date, { suffix: true, humanize: true });
          }
          return moment(date).fromNow();
        },
        age: function(date, options) {
          options = options || {};
          return relativeDate(date, options);
        },
        time: function(date) {
          return format(date, 'time');
        }
      };
    });

}());
