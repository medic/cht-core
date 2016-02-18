var _ = require('underscore');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  inboxServices.factory('AnalyticsModules',
    ['$q', 'Settings', 'ScheduledForms',
    function($q, Settings, ScheduledForms) {

      var getAncModule = function(settings) {
        return {
          label: 'Antenatal Care',
          state: 'analytics.anc',
          available: function() {
            return _.every([
              'registration', 'registrationLmp', 'visit', 'delivery', 'flag'
            ], function(prop) {
              var formCode = settings.anc_forms[prop];
              return !!settings.forms[formCode];
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

      var getStockMonitoringModule = function(settings, scheduledForms) {
        return {
          label: 'Stock Monitoring',
          state: 'analytics.stock',
          available: function() {
            return scheduledForms.length;
          }
        };
      };

      var getModules = function(settings, scheduledForms) {
        return _.filter([
          getAncModule(settings, scheduledForms),
          getStockMonitoringModule(settings, scheduledForms),
          getTargetsModule(settings, scheduledForms)
        ], function(module) {
          return module.available();
        });
      };

      return function() {
        return $q.all([ Settings(), ScheduledForms() ])
          .then(function(results) {
            return getModules(results[0], results[1]);
          });
      };
    }
  ]);

}());
