var _ = require('underscore'),
    stock = require('kujua-reporting/shows');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  inboxServices.factory('AnalyticsModules',
    ['$resource',
    function($resource) {
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
              $resource('/api/active-pregnancies', {}, { query: {
                method: 'GET',
                isArray: false,
                cache: true
              }}).query(function(data) {
                scope.activePregnancies = data;
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
