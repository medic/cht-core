var _ = require('underscore');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');


  /**
    * This service checks the settings for forms that are expected
    * to be submitted every week, month, year, etc. To be returned,
    * an uploaded form must have an entry in the kujua-reporting
    * property. Settings example:
    *
    * {
    *  forms: { R: '...', D: '...', ... },
    *  'kujua-reporting': [ { code: 'R' }, { code: 'D' } ]
    * }
    */
  inboxServices.factory('ScheduledForms',
    ['Settings',
    function(Settings) {
      return function() {
        return Settings().then(function(settings) {
          var results = [];
          _.each(_.pairs(settings.forms), function(pair) {
            if (_.some(settings['kujua-reporting'], function(report) {
              return report.code === pair[0];
            })) {
              results.push(pair[1]);
            }
          });
          return results;
        });
      };
    }
  ]);

}());
