angular.module('inboxServices').factory('ZScore',
  function(
    DB
  ) {

    'use strict';
    'ngInject';

    var CONFIGURATION_DOC_ID = 'zscore-charts';
    var MINIMUM_Z_SCORE = -4;
    var MAXIMUM_Z_SCORE = 4;
    var CONFIGURATIONS = [
      {
        id: 'weight-for-age',
        property: 'weightForAge',
        required: [ 'sex', 'age', 'weight' ],
        xAxis: 'age',
        yAxis: 'weight'
      },
      {
        id: 'height-for-age',
        property: 'heightForAge',
        required: [ 'sex', 'age', 'height' ],
        xAxis: 'age',
        yAxis: 'height'
      },
      {
        id: 'weight-for-height',
        property: 'weightForHeight',
        required: [ 'sex', 'height', 'weight' ],
        xAxis: 'height',
        yAxis: 'weight'
      }
    ];

    var findChart = function(charts, id) {
      for (var i = 0; i < charts.length; i++) {
        if (charts[i].id === id) {
          return charts[i];
        }
      }
    };

    var hasRequiredOptions = function(configuration, options) {
      return configuration.required.every(function(required) {
        return !!options[required];
      });
    };

    var findClosestDataSet = function(data, key) {
      if (key < data[0].key || key > data[data.length - 1].key) {
        // the key isn't covered by the configured data points
        return;
      }
      var current = { diff: Infinity };
      data.forEach(function(datum) {
        var diff = Math.abs(datum.key - key);
        if (diff < current.diff) {
          current.diff = diff;
          current.points = datum.points;
        }
      });
      return current.points;
    };

    var findZScore = function(data, key) {
      var lowerIndex;
      data.forEach(function(datum, i) {
        if (datum <= key) {
          lowerIndex = i;
        }
      });
      if (!lowerIndex) {
        // given key is less than the minimum standard deviation
        return MINIMUM_Z_SCORE;
      }
      if (lowerIndex >= data.length - 1) {
        // given key is above the maximum standard deviation
        return MAXIMUM_Z_SCORE;
      }
      var upperIndex = lowerIndex + 1;
      var lowerValue = data[lowerIndex];
      var upperValue = data[upperIndex];
      var ratio = (key - lowerValue) / (upperValue - lowerValue);
      return lowerIndex + MINIMUM_Z_SCORE + ratio;
    };

    var calculate = function(configuration, charts, options) {
      if (!hasRequiredOptions(configuration, options)) {
        return;
      }
      var chart = findChart(charts, configuration.id);
      if (!chart) {
        // no chart configured in the database
        return;
      }
      var sexData = chart.data[options.sex];
      if (!sexData) {
        // no data for the given sex
        return;
      }
      var xAxisData = findClosestDataSet(sexData, options[configuration.xAxis]);
      if (!xAxisData) {
        // the key lies outside of the lookup table range
        return;
      }
      return findZScore(xAxisData, options[configuration.yAxis]);
    };

    return function(options) {
      options = options || {};
      return DB().get(CONFIGURATION_DOC_ID)
        .then(function(doc) {
          var result = {};
          CONFIGURATIONS.forEach(function(configuration) {
            result[configuration.property] = calculate(configuration, doc.charts, options);
          });
          return result;
        })
        .catch(function(err) {
          if (err.status === 404) {
            throw new Error('zscore-charts doc not found');
          }
          throw err;
        });
    };
  }

);
