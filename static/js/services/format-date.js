var moment = require('moment');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  inboxServices.factory('FormatDate', ['Settings',
    function(Settings) {

      var config = {
        date: 'DD-MMM-YYYY',
        datetime: 'DD-MMM-YYYY HH:mm:ss'
      };

      Settings(function(err, res) {
        if (err) {
          return console.log('Error fetching settings', err);
        }
        config = {
          date: res.date_format,
          datetime: res.reported_date_format
        };
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
        }
      };
    }
  ]);
  
}()); 
