var _ = require('underscore'),
    moment = require('moment'),
    d3 = require('d3');

/*
 * This module is used for displaying ANC statistics. The page contains
 * a set of "widgets" which display different stats in different ways
 * including charts and tables. Each widget requests its data directly
 * from an api endpoint which means all the computation happens on
 * server side and subsequently it doesn't work offline.
 *
 * The server uses lucene heavily to generate the statistics  so you'll
 * need to install and run couchdb-lucene (instructions in the README).
 *
 * To enable the widget you must complete the anc_forms section of the
 * settings and provide valid JSON forms for each of:
 *    'registration', 'registrationLmp', 'visit', 'delivery', 'flag'
 *
 * Standard configurations are available in:
 *    https://github.com/medic/medic-data/tree/master/data/generic-anc/base
 */
angular.module('inboxControllers').controller('AnalyticsAncCtrl',
  function (
    $http,
    $log,
    $scope,
    $translate,
    UserDistrict
  ) {

    'use strict';
    'ngInject';

    var VISIT_COLORS = ['#E33030', '#DB9A9A', '#9DC49D', '#49A349'];
    var DELIVERY_COLORS = {
      F: { label: 'Institutional Delivery', color: '#49A349' },
      S: { label: 'At home with SBA', color: '#D19D2E' },
      NS: { label: 'At home without SBA', color: '#E33030' }
    };
    var PIE_CHART_OPTIONS = {
      chart: {
        type: 'pieChart',
        height: 250,
        x: function(elem) {
          return $translate.instant(DELIVERY_COLORS[elem.key].label);
        },
        y: function(elem) {
          return elem.value;
        },
        valueFormat: function(d){
          return d3.format(',.0f')(d);
        },
        showLabels: true,
        showLegend: true,
        labelType: 'value',
        color: function(elem) {
          // coloring the legend => elem
          // coloring the chart  => elem.data
          var data = elem.data || elem;
          return DELIVERY_COLORS[data.key].color;
        }
      }
    };
    var BAR_CHART_OPTIONS = {
      chart: {
        type: 'discreteBarChart',
        height: 250,
        width: 300,
        x: function(d){ return d.label; },
        y: function(d){ return d.value; },
        showValues: true,
        showYAxis: false,
        valueFormat: function(d) {
          return d;
        },
        color: VISIT_COLORS
      }
    };
    var LINE_CHART_OPTIONS = {
      chart: {
        type: 'lineChart',
        height: 250,
        width: 300,
        x: function(d, i) {
          return i;
        },
        y: function(d) {
          return d.count;
        },
        valueFormat: function(d){
          return d3.format(',.0f')(d);
        },
        interpolate: 'monotone',
        showLegend: false,
        xAxis: {
          tickFormat: function(d) {
            return moment()
              .subtract(12 - d, 'months')
              .format('MMM YYYY');
          }
        },
        yAxis: {
          tickFormat: function(d) {
            return d3.format(',.0f')(d);
          }
        },
        tooltip: {
          contentGenerator: function (e) {
            var content = $translate.instant('Number in month', {
              count: e.series[0].value,
              month: e.point.month
            });
            return  '<p>' + content + '</p>';
          }
        }
      }
    };

    var request = function(url, district, callback) {
      $http.get(url, { params: { district: district, cache: true } })
        .then(function(response) {
          callback(null, response.data);
        })
        .catch(function(response) {
          $log.error('Error requesting module', response.data);
          callback(response.data);
        });
    };

    $scope.activePregnancies = { loading: true };
    $scope.upcomingAppointments = { loading: true };
    $scope.missedAppointments = { loading: true };
    $scope.upcomingDueDates = { loading: true };
    $scope.highRisk = { loading: true };
    $scope.totalBirths = { loading: true };
    $scope.missingDeliveryReports = { loading: true };
    $scope.deliveryLocation = { loading: true, options: PIE_CHART_OPTIONS };
    $scope.visitsCompleted = { loading: true, options: BAR_CHART_OPTIONS };
    $scope.monthlyRegistrations = { loading: true, options: LINE_CHART_OPTIONS };
    $scope.monthlyDeliveries = { loading: true, options: LINE_CHART_OPTIONS };

    UserDistrict()
      .then(function(district) {
        request('/api/active-pregnancies', district, function(err, data) {
          $scope.activePregnancies = { error: err, data: data };
        });

        request('/api/upcoming-appointments', district, function(err, data) {
          $scope.upcomingAppointments = { error: err, data: data, order: 'date' };
        });

        request('/api/missed-appointments', district, function(err, data) {
          $scope.missedAppointments = { error: err, data: data, order: 'date' };
        });

        request('/api/upcoming-due-dates', district, function(err, data) {
          $scope.upcomingDueDates = { error: err, data: data, order: 'edd' };
        });

        request('/api/high-risk', district, function(err, data) {
          $scope.highRisk = { error: err, data: data, order: 'date' };
        });

        request('/api/total-births', district, function(err, data) {
          $scope.totalBirths = { error: err, data: data };
        });

        request('/api/missing-delivery-reports', district, function(err, data) {
          $scope.missingDeliveryReports = { error: err, data: data, order: 'edd.date' };
        });

        request('/api/delivery-location', district, function(err, data) {
          $scope.deliveryLocation.loading = false;
          $scope.deliveryLocation.error = err;
          $scope.deliveryLocation.data = data;
        });

        request('/api/visits-completed', district, function(err, data) {
          $scope.visitsCompleted.loading = false;
          $scope.visitsCompleted.err = err;
          $scope.visitsCompleted.data = [{
            key: 'item',
            values: _.map(data, function(d, i) {
              return {
                label: $translate.instant('Number of visits', { number: i + 1 }),
                value: d
              };
            })
          }];
        });

        request('/api/monthly-registrations', district, function(err, data) {
          $scope.monthlyRegistrations.loading = false;
          $scope.monthlyRegistrations.error = err;
          $scope.monthlyRegistrations.data = [{
            key: 'item',
            values: data
          }];
        });

        request('/api/monthly-deliveries', district, function(err, data) {
          $scope.monthlyDeliveries.loading = false;
          $scope.monthlyDeliveries.error = err;
          $scope.monthlyDeliveries.data = [{
            key: 'item',
            values: data
          }];
        });
      })
      .catch(function(err) {
        $log.error('Error fetching district', err);
      });
  }
);
