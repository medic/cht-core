var moment = require('moment');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  inboxServices.factory('FormatDate', ['Settings',
    function(Settings) {

      var config = {
        date: 'DD-MMM-YYYY',
        datetime: 'DD-MMM-YYYY HH:mm:ss',
        ageBreaks: [
          { unit: 'years', key: 'yy', min: 1 },
          { unit: 'months', key: 'MM', min: 1 },
          { unit: 'days', key: 'dd', min: 1 }
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

      return {
        date: function(date) {
          return format(date, 'date');
        },
        datetime: function(date) {
          return format(date, 'datetime');
        },
        relative: function(date) {
          return moment(date).fromNow();
        },
        age: function(date) {
          var now = moment();
          for (var i = 0; i < config.ageBreaks.length; i++) {
            var ageBreak = config.ageBreaks[i];
            var diff = now.diff(date, ageBreak.unit);
            if (diff > ageBreak.min) {
              return moment.localeData().relativeTime(diff, true, ageBreak.key);
            }
          }
          return moment.localeData().relativeTime(1, true, 'd');
        }
      };
    }
  ]);
  
}()); 
