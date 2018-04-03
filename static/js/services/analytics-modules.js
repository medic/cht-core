var _ = require('underscore');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  inboxServices.factory('AnalyticsModules',
    function(
      $log,
      $q,
      ScheduledForms,
      Settings
    ) {

      'ngInject';

      var getTargetsModule = function(settings) {
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

      var getReportingRatesModule = function(settings, scheduledForms) {
        return {
          label: 'Reporting Rates',
          state: 'analytics.reporting',
          available: function() {
            return scheduledForms.length;
          }
        };
      };

      var getModules = function(settings, scheduledForms) {
        return _.filter([
          getReportingRatesModule(settings, scheduledForms),
          getTargetsModule(settings)
        ], function(module) {
          return module.available();
        });
      };

      return function() {
        return $q.all([ Settings(), ScheduledForms() ])
          .then(function(results) {
            var modules = getModules(results[0], results[1]);
            $log.debug('AnalyticsMobules. Enabled modules: ', _.pluck(modules, 'label'));
            return modules;
          });
      };
    }
  );

}());
