var _ = require('underscore'),
    reportingUtils = require('../modules/reporting-rates-utils');

(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('AnalyticsReportingCtrl',
    function (
      $log,
      $scope,
      $timeout,
      ChildFacility,
      DB,
      Facility,
      FormatDataRecord,
      ScheduledForms,
      Settings,
      UserDistrict
    ) {

      'ngInject';

      $scope.facilities = [];

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
          DB()
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
        var dates = reportingUtils.getDates($scope.filters);
        DB()
          .get(district.id || district._id)
          .then(function(district) {
            ChildFacility(district)
              .then(function(facilities) {
                getViewReports(district, dates)
                  .then(function(reports) {
                    $scope.totals = reportingUtils.getTotals(facilities, reports, dates);
                    if (district.type === 'health_center') {
                      $scope.clinics = reportingUtils.getRowsHC(facilities, reports, dates);
                      _.each($scope.clinics, function(f) {
                        f.chart = [
                          { key: 'valid', y: f.valid_percent },
                          { key: 'missing', y: 100 - f.valid_percent }
                        ];
                      });
                    } else {
                      $scope.facilities = reportingUtils.getRows(facilities, reports, dates);
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
                    $log.error('Error fetching reports', err);
                  });
              })
              .catch(function(err) {
                $log.error(err);
              });
          })
          .catch(function(err) {
            $log.error(err);
          });
      };

      var getViewReports = function(doc, dates) {
        var params = reportingUtils.getReportingViewArgs(dates),
            view = 'data_records_by_form_year_month_facility';

        if (dates.reporting_freq === 'week') {
          view = 'data_records_by_form_year_week_facility';
        }

        return DB().query('medic-client/' + view, params)
          .then(function(data) {
            // additional filtering for this facility
            var saved_data = [];
            var idx = doc.type === 'health_center' ? 4 : 3;
            data.rows.forEach(function(row) {
              if (doc._id === row.doc.key[idx]) {
                saved_data.push(row.doc);
              }
            });
            return saved_data;
          });
      };

      UserDistrict()
        .then(function(district) {
          if (district) {
            $scope.setDistrict(district);
          } else {
            // national admin
            Facility({ types: [ 'district_hospital' ] })
              .then(function(districts) {
                $scope.districts = districts;
              })
              .catch(function(err) {
                $log.error(err);
              });
          }
        })
        .catch(function(err) {
          $log.error('Error fetching district', err);
        });
    }
  );

}());
