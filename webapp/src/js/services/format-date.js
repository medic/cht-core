var moment = require('moment');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  inboxServices.factory('FormatDate',
    function(
      $log,
      $translate,
      MomentLocaleData,
      Settings
    ) {

      'ngInject';

      var config = {
        date: 'DD-MMM-YYYY',
        datetime: 'DD-MMM-YYYY HH:mm:ss',
        time: MomentLocaleData().longDateFormat('LT'),
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
        })
        .catch(function(err) {
          $log.error('Error fetching settings', err);
        });

      var format = function(date, key) {
        return moment(date).format(config[key]);
      };

      var getDateDiff = function(date, options) {
        var end = options.end ? moment(options.end) : moment(); // default to now
        end = end.startOf('day'); // remove the time component
        for (var i = 0; i < config.ageBreaks.length; i++) {
          var ageBreak = config.ageBreaks[i];
          var diff = date.diff(end, ageBreak.unit);
          if (Math.abs(diff) > ageBreak.min) {
            return { quantity: diff, key: ageBreak.key };
          }
        }
        return { quantity: 0, key: { singular: 'd', plural: 'dd' } };
      };

      var relativeDate = function(date, options) {
        var diff = getDateDiff(moment(date).startOf('day'), options);
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
        var quantity = Math.abs(diff.quantity);
        var key = quantity === 1 ? diff.key.singular : diff.key.plural;
        var output = MomentLocaleData().relativeTime(quantity, true, key);
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
    }
  );

}());
