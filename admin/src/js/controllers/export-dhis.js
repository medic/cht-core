const _ = require('lodash');
const moment = require('moment');

angular.module('controllers').controller('ExportDhisCtrl',
  function (
    $scope,
    DB,
    Export,
    Settings
  ) {
    'use strict';
    'ngInject';

    const MONTHS_TO_SHOW = 6;

    Settings().then(settingsDoc => {
      $scope.dataSets = settingsDoc.dhisDataSets && Array.isArray(settingsDoc.dhisDataSets) && settingsDoc.dhisDataSets;
      $scope.selected.dataSet = $scope.dataSets[0] && $scope.dataSets[0].guid;
    });

    DB()
      .query('medic-admin/contacts_by_orgunit', { include_docs: true })
      .then(function(result) {
        const places = _.uniqBy(result.rows.map(row => row.doc), '_id');
        
        const mapDataSetToPlaces = {};
        for (const place of places) {
          const orgUnitConfigs = Array.isArray(place.dhis) ? place.dhis : [place.dhis];
          for (const orgUnitConfig of orgUnitConfigs) {
            const dataSet = orgUnitConfig.dataSet || null;
            if (!mapDataSetToPlaces[dataSet]) {
              mapDataSetToPlaces[dataSet] = [];
            }

            mapDataSetToPlaces[dataSet].push({
              id: orgUnitConfig.orgUnit,
              name: place.name,
            });
          }
        }

        for (const place of Object.keys(mapDataSetToPlaces)) {
          _.sortBy(mapDataSetToPlaces[place], ['name']);
        }

        $scope.places = mapDataSetToPlaces;
      });

    $scope.periods = [...Array(MONTHS_TO_SHOW).keys()].map(val => {
      const period = moment().subtract(val, 'months');
      return {
        timestamp: period.valueOf().toString(),
        description: period.format('MMMM, YYYY'),
      };
    });
    $scope.selected = {};

    $scope.export = () => {
      const { dataSet, period, place } = $scope.selected;
      const filters = {
        dataSet,
        date: {
          from: period,
        },
      };

      if (place !== 'all') {
        filters.orgUnit = place;
      }

      Export('dhis', filters, {});
    };
  }
);
