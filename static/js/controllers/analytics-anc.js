var _ = require('underscore'),
    moment = require('moment');

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
(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('AnalyticsAncCtrl',
    function (
      $http,
      $log,
      $scope,
      $translate,
      UserDistrict
    ) {

      'ngInject';

      var request = function(url, district, callback) {
        $http.get(url, { params: { district: district, cache: true } })
          .success(function(data) {
            callback(null, data);
          })
          .error(function(data) {
            $log.error('Error requesting module', data);
            callback(data);
          });
      };

      $scope.activePregnancies = { loading: true };
      $scope.upcomingAppointments = { loading: true };
      $scope.missedAppointments = { loading: true };
      $scope.upcomingDueDates = { loading: true };
      $scope.highRisk = { loading: true };
      $scope.totalBirths = { loading: true };
      $scope.missingDeliveryReports = { loading: true };
      $scope.deliveryLocation = { loading: true };
      $scope.visitsCompleted = { loading: true };
      $scope.monthlyRegistrations = { loading: true };
      $scope.monthlyDeliveries = { loading: true };

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
          $scope.deliveryCodeChartLabelKey = function() {
            return function(elem) {
              return $translate.instant(deliveryCodeMap[elem.key].label);
            };
          };
          $scope.deliveryCodeChartLabelValue = function() {
            return function(elem) {
              return elem.value;
            };
          };
          $scope.deliveryCodeChartColors = function() {
            return function(elem) {
              // coloring the legend => elem
              // coloring the chart  => elem.data
              var data = elem.data || elem;
              return deliveryCodeMap[data.key].color;
            };
          };
          request('/api/delivery-location', district, function(err, data) {
            $scope.deliveryLocation = { error: err, data: data };
          });

          $scope.visitsChartLabelKey = function() {
            return function(d) {
              return $translate.instant('Number of visits', { number: d + 1 });
            };
          };
          $scope.visitsChartLabelValue = function() {
            return function(d) {
              return d;
            };
          };
          var visitsMap = ['#E33030', '#DB9A9A', '#9DC49D', '#49A349'];
          $scope.visitsChartColors = function() {
            return function(d, i) {
              return visitsMap[i];
            };
          };

          request('/api/visits-completed', district, function(err, data) {
            $scope.visitsCompleted = {
              error: err,
              data: [{
                key: 'item',
                values: _.map(data, function(d, i) {
                  return [i, d];
                })
              }]
            };
          });

          $scope.monthlyChartLabelKey = function() {
            return function(d) {
              return moment()
                .subtract(12 - d, 'months')
                .format('MMM YYYY');
            };
          };
          $scope.monthlyChartX = function() {
            return function(d, i) {
              return i;
            };
          };
          $scope.monthlyChartY = function() {
            return function(d) {
              return d.count;
            };
          };
          $scope.monthlyChartToolTip = function() {
            return function(key, x, y) {
              return  '<p>' +
                        $translate.instant('Number in month', { count: y, month: x }) +
                      '</p>';
            };
          };

          request('/api/monthly-registrations', district, function(err, data) {
            $scope.monthlyRegistrations = {
              error: err,
              data: [{
                key: 'item',
                values: data
              }]
            };
          });

          request('/api/monthly-deliveries', district, function(err, data) {
            $scope.monthlyDeliveries = {
              error: err,
              data: [{
                key: 'item',
                values: data
              }]
            };
          });
        })
        .catch(function(err) {
          $log.error('Error fetching district', err);
        });
    }
  );

}());