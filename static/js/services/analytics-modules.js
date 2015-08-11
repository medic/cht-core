var _ = require('underscore'),
    reporting = require('kujua-reporting/shows'),
    moment = require('moment');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  inboxServices.factory('AnalyticsModules',
    ['$resource', '$log', 'UserDistrict',
    function($resource, $log, UserDistrict) {

      var request = function(url, district, options, callback) {
        if (!callback) {
          callback = options;
          options = {};
        }
        _.defaults(options, {
          method: 'GET',
          isArray: true,
          cache: true
        });
        $resource(url, { district: district }, { query: options }).query(
          function(data) {
            callback(null, data);
          },
          function(err) {
            $log.error('Error requesting module', err);
            callback(err);
          }
        );
      };

      return function(settings) {
        var modules = [
          {
            id: 'anc',
            label: 'Antenatal Care',
            available: function() {
              return _.every([
                'registration', 'registrationLmp', 'visit', 'delivery', 'flag'
              ], function(prop) {
                var formCode = settings.anc_forms[prop];
                return !!settings.forms[formCode];
              });
            },
            render: function(scope) {

              scope.activePregnancies = { loading: true };
              scope.upcomingAppointments = { loading: true };
              scope.missedAppointments = { loading: true };
              scope.upcomingDueDates = { loading: true };
              scope.highRisk = { loading: true };
              scope.totalBirths = { loading: true };
              scope.missingDeliveryReports = { loading: true };
              scope.deliveryLocation = { loading: true };
              scope.visitsCompleted = { loading: true };
              scope.visitsDuring = { loading: true };
              scope.monthlyRegistrations = { loading: true };
              scope.monthlyDeliveries = { loading: true };

              UserDistrict(function(err, district) {

                if (err) {
                  return $log.error('Error fetching district', err);
                }

                request('/api/active-pregnancies', district, { isArray: false }, function(err, data) {
                  scope.activePregnancies = { error: err, data: data };
                });

                request('/api/upcoming-appointments', district, function(err, data) {
                  scope.upcomingAppointments = { error: err, data: data, order: 'date' };
                });

                request('/api/missed-appointments', district, function(err, data) {
                  scope.missedAppointments = { error: err, data: data, order: 'date' };
                });

                request('/api/upcoming-due-dates', district, function(err, data) {
                  scope.upcomingDueDates = { error: err, data: data, order: 'edd' };
                });

                request('/api/high-risk', district, function(err, data) {
                  scope.highRisk = { error: err, data: data, order: 'date' };
                });

                request('/api/total-births', district, { isArray: false }, function(err, data) {
                  scope.totalBirths = { error: err, data: data };
                });

                request('/api/missing-delivery-reports', district, function(err, data) {
                  scope.missingDeliveryReports = { error: err, data: data, order: 'edd' };
                });

                var deliveryCodeMap = {
                  F: {
                    label: 'Institutional Delivery',
                    color: '#49A349'
                  },
                  S: {
                    label: 'At home with SBA',
                    color: '#D19D2E'
                  },
                  NS: {
                    label: 'At home without SBA',
                    color: '#E33030'
                  }
                };
                scope.deliveryCodeChartLabelKey = function() {
                  return function(elem) {
                    return deliveryCodeMap[elem.key].label;
                  };
                };
                scope.deliveryCodeChartLabelValue = function() {
                  return function(elem) {
                    return elem.value;
                  };
                };
                scope.deliveryCodeChartColors = function() {
                  return function(elem) {
                    // coloring the legend => elem
                    // coloring the chart  => elem.data
                    var data = elem.data || elem;
                    return deliveryCodeMap[data.key].color;
                  };
                };
                request('/api/delivery-location', district, function(err, data) {
                  scope.deliveryLocation = { error: err, data: data };
                });

                scope.visitsChartLabelKey = function() {
                  return function(d) {
                    return (d + 1) + '+ visits';
                  };
                };
                scope.visitsChartLabelValue = function() {
                  return function(d) {
                    return d;
                  };
                };
                var visitsMap = ['#E33030', '#DB9A9A', '#9DC49D', '#49A349'];
                scope.visitsChartColors = function() {
                  return function(d, i) {
                    return visitsMap[i];
                  };
                };

                request('/api/visits-completed', district, function(err, data) {
                  scope.visitsCompleted = {
                    error: err,
                    data: [{
                      key: 'item',
                      values: _.map(data, function(d, i) {
                        return [i, d];
                      })
                    }]
                  };
                });

                request('/api/visits-during', district, function(err, data) {
                  scope.visitsDuring = {
                    error: err,
                    data: [{
                      key: 'item',
                      values: _.map(data, function(d, i) {
                        return [i, d];
                      })
                    }]
                  };
                });

                scope.monthlyChartLabelKey = function() {
                  return function(d) {
                    return moment()
                      .subtract(12 - d, 'months')
                      .format('MMM YYYY');
                  };
                };
                scope.monthlyChartX = function() {
                  return function(d, i) {
                    return i;
                  };
                };
                scope.monthlyChartY = function() {
                  return function(d) {
                    return d.count;
                  };
                };
                scope.monthlyChartToolTip = function() {
                  return function(key, x, y) {
                    return '<p>' + y + ' in ' + x + '</p>';
                  };
                };

                request('/api/monthly-registrations', district, function(err, data) {
                  scope.monthlyRegistrations = {
                    error: err,
                    data: [{
                      key: 'item',
                      values: data
                    }]
                  };
                });

                request('/api/monthly-deliveries', district, function(err, data) {
                  scope.monthlyDeliveries = {
                    error: err,
                    data: [{
                      key: 'item',
                      values: data
                    }]
                  };
                });

              });

            }
          },
          {
            id: 'reporting',
            label: 'Reporting Rates',
            available: function() {
              return Boolean(this.getConfiguredForms());
            },
            getConfiguredForms: function() {
              var forms = settings.forms;
              var configuredForms = settings['kujua-reporting'];
              return _.some(configuredForms, function(f) {
                return !!forms[f.code];
              });
            },
            render: function(scope) {
              if (scope.filterModel.selectedForm && scope.filterModel.selectedFacility) {
                reporting.renderFacility(
                  scope.filterModel.selectedForm,
                  scope.filterModel.selectedFacility,
                  settings
                );
              }
            }
          }
        ];
        return _.filter(modules, function(module) {
          return module.available();
        });
      };
    }
  ]);

}());
