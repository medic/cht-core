var _ = require('underscore'),
    stockUtils = require('../modules/stock-reporting-utils');

(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('AnalyticsStockCtrl',
    ['$scope', '$log', '$timeout', 'UserDistrict', 'Facility', 'Settings', 'DB', 'ScheduledForms', 'DbView', 'ChildFacility', 'FormatDataRecord',
    function ($scope, $log, $timeout, UserDistrict, Facility, Settings, DB, ScheduledForms, DbView, ChildFacility, FormatDataRecord) {

      $scope.facilities = [];
      $scope.districts = [];

      Settings()
        .then(function(settings) {
          $scope.filters = {
            time_unit: 'month',
            quantity: 3,
            form: settings['kujua-reporting'][0].code
          };
          $scope.$watch('filters', function() {
            if ($scope.district) {
              $scope.setDistrict($scope.district);
            }
          }, true);
        })
        .catch(function(err) {
          $log.error('Error fetching settings', err);
        });

      ScheduledForms()
        .then(function(forms) {
          $scope.forms = forms;
        })
        .catch(function(err) {
          $log.error('Error fetching scheduled forms', err);
        });

      $scope.expandClinic = function(id) {
        if ($scope.expandedClinic === id) {
          $scope.expandedClinic = null;
        } else {
          $scope.expandedClinic = id;
        }
      };

      $scope.expandRecord = function(id) {
        if (!id) {
          return;
        }
        if ($scope.expandedRecord === id) {
          $scope.expandedRecord = null;
        } else {
          DB.get()
            .get(id)
            .then(FormatDataRecord)
            .then(function(formatted) {
              $timeout(function() {
                $scope.formattedRecord = formatted[0];
                $scope.expandedRecord = id;
              });
            })
            .catch(function(err) {
              $log.error('Error getting doc', err);
            });
        }
      };

      $scope.setTime = function(time) {
        $scope.filters.time_unit = time.time_unit;
        $scope.filters.quantity = time.quantity;
      };

      $scope.setForm = function(form) {
        $scope.filters.form = form;
      };

      var colours = {
        valid: '#009900',
        invalid: '#990000',
        missing: '#999999'
      };
      $scope.colorFunction = function() {
        return function(d) {
          return colours[d.data.key];
        };
      };

      $scope.setDistrict = function(district) {
        $scope.district = district;
        var dates = stockUtils.getDates($scope.filters);
        DB.get()
          .get(district.id || district._id)
          .then(function(district) {
            ChildFacility(district, function(err, facilities) {
              if (err) {
                return $log.error(err);
              }
              getViewReports(DbView, district, dates)
                .then(function(reports) {
                  $scope.totals = stockUtils.getTotals(facilities, reports, dates);
                  if (district.type === 'health_center') {
                    $scope.clinics = stockUtils.getRowsHC(facilities, reports, dates);
                    _.each($scope.clinics, function(f) {
                      f.chart = [
                        { key: 'valid', y: f.valid_percent },
                        { key: 'missing', y: 100 - f.valid_percent }
                      ];
                    });
                  } else {
                    $scope.facilities = stockUtils.getRows(facilities, reports, dates);
                    _.each($scope.facilities, function(f) {
                      f.chart = [
                        { key: 'valid', y: f.valid_percent },
                        { key: 'missing', y: 100 - f.valid_percent }
                      ];
                    });
                  }
                  $scope.chart = [
                    { key: 'valid', y: $scope.totals.complete },
                    { key: 'missing', y: $scope.totals.not_submitted },
                    { key: 'invalid', y: $scope.totals.incomplete }
                  ];
                  $scope.xFunction = function() {
                    return function(d) {
                      return d.key;
                    };
                  };
                  $scope.yFunction = function() {
                    return function(d) {
                      return d.y;
                    };
                  };
                })
                .catch(function(err) {
                  console.error('Error fetching reports', err);
                });
            });
          })
          .catch(function(err) {
            $log.error(err);
          });
      };

      var getViewReports = function(DbView, doc, dates) {
        var params = stockUtils.getReportingViewArgs(dates),
            view = 'data_records_by_form_year_month_facility';

        if (dates.reporting_freq === 'week') {
          view = 'data_records_by_form_year_week_facility';
        }

        return DbView(view, { params: params })
          .then(function(data) {
            // additional filtering for this facility
            var saved_data = [];
            var idx = doc.type === 'health_center' ? 4 : 3;
            for (var i in data.results.rows) {
              if (doc._id === data.results.rows[i].key[idx]) {
                // keep orig ordering
                saved_data.unshift(data.results.rows[i]);
              }
            }
            return saved_data;
          });
      };

      UserDistrict(function(err, district) {

        if (err) {
          return $log.error('Error fetching district', err);
        }

        if (district) {
          $scope.setDistrict(district);
        } else {
          // national admin
          Facility({types: ['district_hospital']}, function(err, districts) {
            if (err) {
              $log.error(err);
            }
            $scope.districts = districts;
          });
        }

      });
    }
  ]);

}());
