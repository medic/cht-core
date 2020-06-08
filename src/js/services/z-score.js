angular.module('inboxServices').factory('ZScore',
  function(
    $log,
    Changes,
    DB
  ) {

    'use strict';
    'ngInject';

    const CONFIGURATION_DOC_ID = 'zscore-charts';
    const MINIMUM_Z_SCORE = -4;
    const MAXIMUM_Z_SCORE = 4;

    let tables;

    const findTable = function(id) {
      for (let i = 0; i < tables.length; i++) {
        if (tables[i].id === id) {
          return tables[i];
        }
      }
    };

    const findClosestDataSet = function(data, key) {
      if (key < data[0].key || key > data[data.length - 1].key) {
        // the key isn't covered by the configured data points
        return;
      }
      const current = { diff: Infinity };
      data.forEach(function(datum) {
        const diff = Math.abs(datum.key - key);
        if (diff < current.diff) {
          current.diff = diff;
          current.points = datum.points;
        }
      });
      return current.points;
    };

    const findZScore = function(data, key) {
      let lowerIndex = -1;
      data.forEach(function(datum, i) {
        if (datum <= key) {
          lowerIndex = i;
        }
      });
      if (lowerIndex === -1) {
        // given key is less than the minimum standard deviation
        return MINIMUM_Z_SCORE;
      }
      if (lowerIndex >= data.length - 1) {
        // given key is above the maximum standard deviation
        return MAXIMUM_Z_SCORE;
      }
      const upperIndex = lowerIndex + 1;
      const lowerValue = data[lowerIndex];
      const upperValue = data[upperIndex];
      const ratio = (key - lowerValue) / (upperValue - lowerValue);
      return lowerIndex + MINIMUM_Z_SCORE + ratio;
    };

    const calculate = function(data, x, y) {
      const xAxisData = findClosestDataSet(data, x);
      if (!xAxisData) {
        // the key lies outside of the lookup table range
        return;
      }
      return findZScore(xAxisData, y);
    };

    const init = function() {
      // use allDocs instead of get so a 404 doesn't report an error
      return DB().allDocs({ key: CONFIGURATION_DOC_ID, include_docs: true })
        .then(function(result) {
          tables = result.rows.length && result.rows[0].doc.charts;
        });
    };

    Changes({
      key: 'zscore-service',
      filter: function(change) {
        return change.id === CONFIGURATION_DOC_ID;
      },
      callback: function() {
        init();
      }
    });

    return function() {
      return init().then(function() {
        return function(tableId, sex, x, y) {
          if (!tables) {
            // log an error if the z-score utility is used but not configured
            $log.error('Doc "' + CONFIGURATION_DOC_ID + '" not found');
            return;
          }
          if (!sex || !x || !y) {
            // the form may not have been filled out yet
            return;
          }
          const table = findTable(tableId);
          if (!table) {
            // log an error if the z-score utility is used but not configured
            $log.error('Requested z-score table not found', tableId);
            return;
          }
          const data = table.data[sex];
          if (!data) {
            $log.error('The ' + tableId + ' z-score table is not configured for ' + sex + ' children');
            // no data for the given sex
            return;
          }
          return calculate(data, x, y);
        };
      });
    };
  }

);
