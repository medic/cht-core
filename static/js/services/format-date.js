var moment = require('moment');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  inboxServices.factory('FormatDate', ['Settings',
    function(Settings) {

      var config;
      var running = false;

      var format = function(date, key) {
        if (config) {
          return moment(date).format(config[key]);
        }
        if (!running) {
          running = true;
          Settings(function(err, res) {
            if (err) {
              return console.log('Error fetching settings', err);
            }
            config = {
              datetime: res.reported_date_format,
              date: res.date_format
            };
          });
        }
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
