var moment = require('moment');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  inboxServices.factory('FormatDate', ['$translate', 'Settings',
    function($translate, Settings) {

      var config = {
        date: 'DD-MMM-YYYY',
        datetime: 'DD-MMM-YYYY HH:mm:ss',
        ageBreaks: [
          { unit: 'years', key: 'yy', min: 1 },
          { unit: 'months', key: 'MM', min: 1 },
          { unit: 'days', key: 'dd', min: 0 }
        ]
      };

      Settings(function(err, res) {
        if (err) {
          return console.log('Error fetching settings', err);
        }
        config.date = res.date_format;
        config.datetime = res.reported_date_format;
      });

      var format = function(date, key) {
        return moment(date).format(config[key]);
      };

      var getDateDiff = function(date) {
        var now = moment();
        for (var i = 0; i < config.ageBreaks.length; i++) {
          var ageBreak = config.ageBreaks[i];
          var diff = date.diff(now, ageBreak.unit);
          if (Math.abs(diff) > ageBreak.min) {
            return { quantity: diff, key: ageBreak.key };
          }
        }
        return { quantity: 0, key: 'd' };
      };

      var relativeDate = function(date, withSuffix) {
        var diff = getDateDiff(date);
        if (diff.quantity === 0 && diff.key === 'd') {
          return $translate.instant('today');
        }
        var locale = moment.localeData();
        var output = locale.relativeTime(Math.abs(diff.quantity), true, diff.key);
        if (withSuffix) {
          return locale.pastFuture(diff.quantity, output);
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
          if (options.withoutTime) {
            return relativeDate(date, true);
          }
          return moment(date).fromNow();
        },
        age: function(date) {
          return relativeDate(date);
        }
      };
    }
  ]);
  
}()); 
