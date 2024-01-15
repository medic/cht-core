/*
Integrating with DHIS2 -- https://docs.communityhealthtoolkit.org/apps/features/integrations/dhis2/
*/
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
    const ALL_DATASETS = '_all_';

    $scope.selected = {};
    Settings().then(settingsDoc => {
      $scope.dataSets = Array.isArray(settingsDoc.dhis_data_sets) && settingsDoc.dhis_data_sets;
      $scope.selected.dataSet = $scope.dataSets[0] && $scope.dataSets[0].id;
    });

    const loadPlaces = () => (
      DB()
        .query('medic-admin/contacts_by_dhis_orgunit', { include_docs: true })
        .then(function(result) {
          const places = _.uniqBy(result.rows.map(row => row.doc), '_id');

          const mapDataSetToPlaces = {};
          for (const place of places) {
            const orgUnitConfigs = Array.isArray(place.dhis) ? place.dhis : [place.dhis];
            for (const orgUnitConfig of orgUnitConfigs) {
              const dataSet = orgUnitConfig.dataSet || ALL_DATASETS;
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
            mapDataSetToPlaces[place] = _.sortBy(mapDataSetToPlaces[place], ['name']);
          }

          $scope.places = mapDataSetToPlaces;
        })
    );
    loadPlaces();

    $scope.periods = [...Array(MONTHS_TO_SHOW).keys()].map(monthCount => {
      const period = moment().subtract(monthCount, 'months');
      return {
        timestamp: period.valueOf().toString(),
        description: period.format('MMMM, YYYY'),
      };
    });

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
  });
