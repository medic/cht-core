const _ = require('lodash/core');

(function () {

  'use strict';

  angular.module('inboxServices').factory('AnalyticsModules',
    function(
      $log,
      $q,
      ScheduledForms,
      Settings
    ) {

      'ngInject';

      const getTargetsModule = function(settings) {
        return {
          label: 'analytics.targets',
          state: 'analytics.targets',
          available: function() {
            return settings.tasks &&
                   settings.tasks.targets &&
                   settings.tasks.targets.enabled;
          }
        };
      };

      const getReportingRatesModule = function(settings, scheduledForms) {
        return {
          label: 'Reporting Rates',
          state: 'analytics.reporting',
          available: function() {
            return scheduledForms.length;
          }
        };
      };

      const getModules = function(settings, scheduledForms) {
        return _.filter([
          getReportingRatesModule(settings, scheduledForms),
          getTargetsModule(settings)
        ], function(module) {
          return module.available();
        });
      };

      /**
       * @ngdoc service
       * @name AnalyticsModules
       * @description Finds all the enabled analytics modules
       * @memberof inboxServices
       * @returns {Promise} A Promise to return an array of object.
       */
      return function() {
        return $q.all([ Settings(), ScheduledForms() ])
          .then(function(results) {
            const modules = getModules(results[0], results[1]);
            $log.debug('AnalyticsMobules. Enabled modules: ', _.map(modules, 'label'));
            return modules;
          });
      };
    }
  );

}());
