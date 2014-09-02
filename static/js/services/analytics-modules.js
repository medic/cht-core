var _ = require('underscore'),
    stock = require('kujua-reporting/shows');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  inboxServices.factory('AnalyticsModules',
    ['$resource', 'UserDistrict',
    function($resource, UserDistrict) {
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

                $resource('/api/active-pregnancies', { district: district }, { query: {
                  method: 'GET',
                  isArray: false,
                  cache: true
                }}).query(function(data) {
                  scope.activePregnancies = data;
                });

                $resource('/api/upcoming-appointments', { district: district }, { query: {
                  method: 'GET',
                  isArray: true,
                  cache: true
                }}).query(function(data) {
                  scope.upcomingAppointments = {
                    data: data,
                    order: 'date'
                  };
                });

                $resource('/api/missed-appointments', { district: district }, { query: {
                  method: 'GET',
                  isArray: true,
                  cache: true
                }}).query(function(data) {
                  scope.missedAppointments = {
                    data: data,
                    order: 'date'
                  };
                });

                $resource('/api/upcoming-due-dates', { district: district }, { query: {
                  method: 'GET',
                  isArray: true,
                  cache: true
                }}).query(function(data) {
                  scope.upcomingDueDates = {
                    data: data,
                    order: 'edd'
                  };
                });

                $resource('/api/high-risk', { district: district }, { query: {
                  method: 'GET',
                  isArray: true,
                  cache: true
                }}).query(function(data) {
                  scope.highRisk = {
                    data: data,
                    order: 'date'
                  };
                });

                $resource('/api/total-births', { district: district }, { query: {
                  method: 'GET',
                  isArray: false,
                  cache: true
                }}).query(function(data) {
                  scope.totalBirths = data;
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
