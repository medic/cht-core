const _ = require('lodash/core');
const d3 = require('d3');
const reportingUtils = require('../modules/reporting-rates-utils');

angular.module('inboxControllers').controller('AnalyticsReportingDetailCtrl',
  function (
    $log,
    $ngRedux,
    $q,
    $scope,
    $state,
    $timeout,
    ChildFacility,
    DB,
    FormatDataRecord,
    GlobalActions,
    PlaceHierarchy,
    Selectors,
    Settings
  ) {

    'use strict';
    'ngInject';

    const ctrl = this;
    const mapStateToTarget = function(state) {
      return {
        filters: Selectors.getFilters(state)
      };
    };
    const mapDispatchToTarget = function(dispatch) {
      const globalActions = GlobalActions(dispatch);
      return {
        setFilter: globalActions.setFilter
      };
    };
    const unsubscribe = $ngRedux.connect(mapStateToTarget, mapDispatchToTarget)(ctrl);

    ctrl.error = false;

    ctrl.setFilter({ form: $state.params.form });
    ctrl.setFilter({ place: $state.params.place });
    ctrl.facilities = [];

    Settings()
      .then(function(settings) {
        const newSettings = _.find(settings['kujua-reporting'], { code: ctrl.filters.form });
        ctrl.setFilter({ reporting_freq: newSettings && newSettings.reporting_freq });
      })
      .catch(function(err) {
        $log.error('Error fetching settings', err);
      });

    const TRANSLATION_KEYS = {
      week: [
        'week',
        'week.plural'
      ],
      month: [
        'month',
        'month.plural'
      ],
      quarter: [
        'quarter',
        'quarter.plural'
      ],
      year: [
        'year',
        'year.plural'
      ]
    };

    ctrl.getTranslationKey = function(key, plural) {
      return TRANSLATION_KEYS[key][ (plural ? 1 : 0) ];
    };

    ctrl.expandClinic = function(id) {
      if (ctrl.expandedClinic === id) {
        ctrl.expandedClinic = null;
      } else {
        ctrl.expandedClinic = id;
      }
    };

    ctrl.expandRecord = function(id) {
      if (!id) {
        return;
      }
      if (ctrl.expandedRecord === id) {
        ctrl.expandedRecord = null;
      } else {
        $timeout(function() {
          ctrl.loadingRecord = id;
        });
        DB()
          .get(id)
          .then(FormatDataRecord)
          .then(function(formatted) {
            $timeout(function() {
              ctrl.loadingRecord = false;
              ctrl.formattedRecord = formatted[0];
              ctrl.expandedRecord = id;
            });
          })
          .catch(function(err) {
            ctrl.loadingRecord = false;
            $log.error('Error getting doc', err);
          });
      }
    };

    ctrl.setTimeUnit = function(time) {
      ctrl.setFilter({ time_unit: time });
      setDistrict();
    };

    ctrl.setTimeQuantity = function(num) {
      ctrl.setFilter({ quantity: num });
      setDistrict();
    };

    const findDistrict = function(place) {
      while(place && place.parent) {
        place = place.parent;
      }
      return place;
    };

    const getRows = function(type, facilities, reports, dates) {
      const rowsFn = type === 'health_center' ? reportingUtils.getRowsHC : reportingUtils.getRows;
      const rows = rowsFn(facilities, reports, dates);
      rows.forEach(function(facility) {
        facility.chart = [
          { key: 'valid', y: facility.valid_percent },
          { key: 'missing', y: 100 - facility.valid_percent }
        ];
      });
      return rows;
    };

    const colours = {
      valid: '#009900',
      invalid: '#990000',
      missing: '#999999'
    };
    const colorFunction = function(d) {
      return colours[d.key];
    };
    const xFunction = function(d) {
      return d.key;
    };
    const yFunction = function(d) {
      return d.y;
    };

    ctrl.pieChartOptions = {
      chart: {
        type: 'pieChart',
        height: 220,
        width: 220,
        x: xFunction,
        y: yFunction,
        valueFormat: function(d){
          return d3.format(',.0f')(d);
        },
        margin: {
          left: 0,
          top: 20,
          bottom: 0,
          right: 0
        },
        showLabels: true,
        showLegend: false,
        labelType: 'percent',
        color: colorFunction
      }
    };

    ctrl.miniPieChartOptions = {
      chart: {
        type: 'pieChart',
        height: 40,
        width: 40,
        x: xFunction,
        y: yFunction,
        valueFormat: function(d){
          return d3.format(',.0f')(d);
        },
        margin: {
          left: 0,
          top: 0,
          bottom: 0,
          right: 0
        },
        showLabels: false,
        showLegend: false,
        color: colorFunction
      }
    };

    const setDistrict = function(placeId) {
      ctrl.error = false;
      ctrl.loadingTotals = true;
      const dates = reportingUtils.getDates(ctrl.filters);
      DB()
        .get(placeId || ctrl.place._id)
        .then(function(place) {
          return $q.all([
            ChildFacility(place),
            getViewReports(place, dates)
          ])
            .then(function(results) {
              const facilities = results[0];
              const reports = results[1];

              ctrl.totals = reportingUtils.getTotals(facilities, reports, dates);
              const rows = getRows(place.type, facilities, reports, dates);
              if (place.type === 'health_center') {
                ctrl.clinics = rows;
              } else {
                ctrl.facilities = rows;
              }
              ctrl.chart = [
                { key: 'valid', y: ctrl.totals.complete },
                { key: 'missing', y: ctrl.totals.not_submitted },
                { key: 'invalid', y: ctrl.totals.incomplete }
              ];
              ctrl.setFilter({ district: findDistrict(place) });
              ctrl.place = place;
              ctrl.loadingTotals = false;
            });
        })
        .catch(function(err) {
          $log.error('Error setting place.', err);
          ctrl.error = true;
          ctrl.loadingTotals = false;
        });
    };

    setDistrict($state.params.place);

    const loadAvailableFacilities = function() {
      PlaceHierarchy()
        .then(function(hierarchy) {
          ctrl.facilities = hierarchy;
        })
        .catch(function(err) {
          $log.error('Error loading facilities', err);
        });
    };
    loadAvailableFacilities();

    const getViewReports = function(doc, dates) {
      const params = reportingUtils.getReportingViewArgs(dates);
      let view = 'reports_by_form_year_month_places';

      if (dates.reporting_freq === 'week') {
        view = 'reports_by_form_year_week_places';
      }

      return DB().query('medic-client/' + view, params)
        .then(function(data) {
          // additional filtering for this facility
          const saved_data = [];
          const contactIdProperty = doc.type === 'health_center' ? 'healthCenterId' : 'districtId';
          data.rows.forEach(function(row) {
            if (doc._id === row.value[contactIdProperty]) {
              saved_data.push(row);
            }
          });
          return saved_data;
        });
    };

    $scope.$on('$destroy', unsubscribe);
  }
);
