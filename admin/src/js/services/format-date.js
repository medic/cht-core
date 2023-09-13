const moment = require('moment');

(function () {

  'use strict';

  angular.module('inboxServices').factory('FormatDate',
    function(
      $log,
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

      return {
        datetime: function(date) {
          return format(date, 'datetime');
        },
      };
    });
}());
