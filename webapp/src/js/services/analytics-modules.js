(function () {

  'use strict';

  angular.module('inboxServices').factory('AnalyticsModules',
    function(
      $log,
      $q,
      Auth,
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

      const getTargetAggregatesModule = (settings, caAggregateTargets) => {
        return {
          label: 'analytics.target.aggregates',
          state: 'analytics.target-aggregates.detail',
          available: () => {
            return settings.tasks &&
                   settings.tasks.targets &&
                   settings.tasks.targets.enabled &&
                   caAggregateTargets; // check if there are targets to aggregate!!
          }
        };
      };

      const getReportingRatesModule = (settings, scheduledForms) => {
        return {
          label: 'Reporting Rates',
          state: 'analytics.reporting',
          available: () => {
            return scheduledForms.length;
          }
        };
      };

      const getModules = (settings, scheduledForms, caAggregateTargets) => {
        return [
          getReportingRatesModule(settings, scheduledForms),
          getTargetsModule(settings),
          getTargetAggregatesModule(settings, caAggregateTargets),
        ].filter(module => module.available());
      };

      /**
       * @ngdoc service
       * @name AnalyticsModules
       * @description Finds all the enabled analytics modules
       * @memberof inboxServices
       * @returns {Promise} A Promise to return an array of object.
       */
      return function() {
        return $q
          .all([
            Settings(),
            ScheduledForms(),
            Auth('can_aggregate_targets').then(() => true).catch(() => false)
          ])
          .then(([settings, scheduledForms, caAggregateTargets]) => {
            const modules = getModules(settings, scheduledForms, caAggregateTargets);
            $log.debug('AnalyticsMobules. Enabled modules: ', modules.map(module => module.label));
            return modules;
          });
      };
    }
  );

}());
