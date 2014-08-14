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
          Settings.query(function(res) {
            config = {
              datetime: res.settings.reported_date_format
            };
          });
        }
      };

      return {

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
