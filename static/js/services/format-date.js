var moment = require('moment');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  inboxServices.factory('FormatDate', ['$translate', 'Settings', 'MomentLocaleData',
    function($translate, Settings, MomentLocaleData) {

      var config = {
        date: 'DD-MMM-YYYY',
        datetime: 'DD-MMM-YYYY HH:mm:ss',
        ageBreaks: [
          { unit: 'years', key: { singular: 'y', plural: 'yy' }, min: 1 },
          { unit: 'months', key: { singular: 'M', plural: 'MM' }, min: 1 },
          { unit: 'days', key: { singular: 'd', plural: 'dd' }, min: 0 }
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
        return { quantity: 0, key: { singular: 'd', plural: 'dd' } };
      };

      var relativeDate = function(date, withSuffix) {
        var diff = getDateDiff(date);
        if (diff.quantity === 0) {
          return $translate.instant('today');
        }
        var quantity = Math.abs(diff.quantity);
        var key = quantity === 1 ? diff.key.singular : diff.key.plural;
        var output = MomentLocaleData().relativeTime(quantity, true, key);
        if (withSuffix) {
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
