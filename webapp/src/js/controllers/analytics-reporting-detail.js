var _ = require('underscore'),
    d3 = require('d3'),
    reportingUtils = require('../modules/reporting-rates-utils');

angular.module('inboxControllers').controller('AnalyticsReportingDetailCtrl',
  function (
    $log,
    $q,
    $scope,
    $state,
    $timeout,
    ChildFacility,
    DB,
    FormatDataRecord,
    Settings
  ) {

    'use strict';
    'ngInject';

    const ctrl = this;
    ctrl.error = false;

    $scope.filters.form = $state.params.form;
    $scope.filters.place = $state.params.place;

    Settings()
      .then(function(settings) {
        var newSettings = _.findWhere(settings['kujua-reporting'], { code: $scope.filters.form });
        $scope.filters.reporting_freq = newSettings && newSettings.reporting_freq;
      })
      .catch(function(err) {
        $log.error('Error fetching settings', err);
      });

    var TRANSLATION_KEYS = {
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
      $scope.filters.time_unit = time;
      setDistrict();
    };

    ctrl.setTimeQuantity = function(num) {
      $scope.filters.quantity = num;
      setDistrict();
    };

    var findDistrict = function(place) {
      while(place && place.type !== 'district_hospital') {
        place = place.parent;
      }
      return place;
    };

    var getRows = function(type, facilities, reports, dates) {
      var rowsFn = type === 'health_center' ? reportingUtils.getRowsHC : reportingUtils.getRows;
      var rows = rowsFn(facilities, reports, dates);
      rows.forEach(function(facility) {
        facility.chart = [
          { key: 'valid', y: facility.valid_percent },
          { key: 'missing', y: 100 - facility.valid_percent }
        ];
      });
      return rows;
    };

    var colours = {
      valid: '#009900',
      invalid: '#990000',
      missing: '#999999'
    };
    var colorFunction = function(d) {
      return colours[d.key];
    };
    var xFunction = function(d) {
      return d.key;
    };
    var yFunction = function(d) {
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

    var setDistrict = function(placeId) {
      ctrl.error = false;
      ctrl.loadingTotals = true;
      var dates = reportingUtils.getDates($scope.filters);
      DB()
        .get(placeId || ctrl.place._id)
        .then(function(place) {
          return $q.all([
            ChildFacility(place),
            getViewReports(place, dates)
          ])
            .then(function(results) {
              var facilities = results[0];
              var reports = results[1];

              ctrl.totals = reportingUtils.getTotals(facilities, reports, dates);
              var rows = getRows(place.type, facilities, reports, dates);
              if (place.type === 'health_center') {
                ctrl.clinics = rows;
              } else {
                ctrl.facilities = rows;
              }
              ctrl.chart = [
                { key: 'valid', y: $scope.totals.complete },
                { key: 'missing', y: $scope.totals.not_submitted },
                { key: 'invalid', y: $scope.totals.incomplete }
              ];
              $scope.filters.district = findDistrict(place);
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

    var getViewReports = function(doc, dates) {
      var params = reportingUtils.getReportingViewArgs(dates),
          view = 'reports_by_form_year_month_places';

      if (dates.reporting_freq === 'week') {
        view = 'reports_by_form_year_week_places';
      }

      return DB().query('medic-client/' + view, params)
        .then(function(data) {
          // additional filtering for this facility
          var saved_data = [];
          var contactIdProperty = doc.type === 'health_center' ? 'healthCenterId' : 'districtId';
          data.rows.forEach(function(row) {
            if (doc._id === row.value[contactIdProperty]) {
              saved_data.push(row);
            }
          });
          return saved_data;
        });
    };
  }
);
