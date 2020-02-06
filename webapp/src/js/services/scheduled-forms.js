const _ = require('lodash/core');
_.toPairs = require('lodash/toPairs');

(function () {

  'use strict';

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
  angular.module('inboxServices').factory('ScheduledForms',
    function(Settings) {
      'ngInject';
      return function() {
        return Settings().then(function(settings) {
          const results = [];
          _.forEach(_.toPairs(settings.forms), function(pair) {
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
  );

}());
