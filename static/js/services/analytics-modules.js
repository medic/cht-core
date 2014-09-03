var _ = require('underscore'),
    stock = require('kujua-reporting/shows');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');


  inboxServices.factory('AnalyticsModules',
    ['$resource', 'UserDistrict',
    function($resource, UserDistrict) {

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
        $resource(url, { district: district }, { query: options })
          .query(callback);
      };

      return function() {
        var modules = [
          {
            id: 'stock',
            label: 'Stock Monitoring',
            available: function() {
              // TODO implement this based off Settings service instead
              return stock.available();
            },
            render: stock.render_page
          },
          {
            id: 'anc',
            label: 'Antenatal Care',
            available: function() {
              // TODO implement some check for forms?
              return true;
            },
            render: function(scope) {

              UserDistrict(function(err, district) {

                if (err) {
                  return console.log('Error fetching district', err);
                }

                request('/api/active-pregnancies', district, { isArray: false }, function(data) {
                  scope.activePregnancies = data;
                });

                request('/api/upcoming-appointments', district, function(data) {
                  scope.upcomingAppointments = { data: data, order: 'date' };
                });

                request('/api/missed-appointments', district, function(data) {
                  scope.missedAppointments = { data: data, order: 'date' };
                });

                request('/api/upcoming-due-dates', district, function(data) {
                  scope.upcomingDueDates = { data: data, order: 'edd' };
                });

                request('/api/high-risk', district, function(data) {
                  scope.highRisk = { data: data, order: 'date' };
                });

                request('/api/total-births', district, { isArray: false }, function(data) {
                  scope.totalBirths = data;
                });

                request('/api/missing-delivery-reports', district, function(data) {
                  scope.missingDeliveryReports = { data: data, order: 'edd' };
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
                request('/api/delivery-location', district, function(data) {
                  scope.deliveryLocation = data;
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

                request('/api/visits-completed', district, function(data) {
                  scope.visitsCompleted = [{
                    key: 'item',
                    values: _.map(data, function(d, i) {
                      return [i, d];
                    })
                  }];
                });

                request('/api/visits-during', district, function(data) {
                  scope.visitsDuring = [{
                    key: 'item',
                    values: _.map(data, function(d, i) {
                      return [i, d];
                    })
                  }];
                });

              });

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
