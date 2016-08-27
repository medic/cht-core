var _ = require('underscore'),
    ANC_FORM_CONFIGURATION_PROPERTIES = [ 'registration', 'registrationLmp', 'visit', 'delivery', 'flag' ];

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

      var getAncModule = function(settings) {
        return {
          label: 'Antenatal Care',
          state: 'analytics.anc',
          available: function() {
            return ANC_FORM_CONFIGURATION_PROPERTIES.every(function(prop) {
              var formCode = settings.anc_forms[prop];
              return formCode && settings.forms && settings.forms[formCode];
            });
          }
        };
      };

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
          getAncModule(settings, scheduledForms),
          getReportingRatesModule(settings, scheduledForms),
          getTargetsModule(settings, scheduledForms)
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
