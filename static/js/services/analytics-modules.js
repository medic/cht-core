var _ = require('underscore'),
    moment = require('moment'),
    stockUtils = require('../modules/stock-reporting-utils');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  inboxServices.factory('AnalyticsModules',
    ['$rootScope', '$timeout', '$log', 'SettingsP', 'HttpWrapper', 'translateFilter', 'DB', 'UserDistrict', 'District', 'DbView', 'ChildFacility', 'FormatDataRecord', 'Search',
    function($rootScope, $timeout, $log, SettingsP, HttpWrapper, translateFilter, DB, UserDistrict, District, DbView, ChildFacility, FormatDataRecord, Search) {

      var request = function(url, district, callback) {
        HttpWrapper.get(url, { params: { district: district, cache: true } })
          .success(function(data) {
            callback(null, data);
          })
          .error(function(data) {
            $log.error('Error requesting module', data);
            callback(new Error(data));
          });
      };

      var getAncModule = function(settings) {
        return {
          id: 'anc',
          label: 'Antenatal Care',
          available: function() {
            return _.every([
              'registration', 'registrationLmp', 'visit', 'delivery', 'flag'
            ], function(prop) {
              var formCode = settings.anc_forms[prop];
              return !!settings.forms[formCode];
            });
          },
          render: function(scope) {

            scope.activePregnancies = { loading: true };
            scope.upcomingAppointments = { loading: true };
            scope.missedAppointments = { loading: true };
            scope.upcomingDueDates = { loading: true };
            scope.highRisk = { loading: true };
            scope.totalBirths = { loading: true };
            scope.missingDeliveryReports = { loading: true };
            scope.deliveryLocation = { loading: true };
            scope.visitsCompleted = { loading: true };
            scope.monthlyRegistrations = { loading: true };
            scope.monthlyDeliveries = { loading: true };

            UserDistrict(function(err, district) {

              if (err) {
                return $log.error('Error fetching district', err);
              }

              request('/api/active-pregnancies', district, function(err, data) {
                scope.activePregnancies = { error: err, data: data };
              });

              request('/api/upcoming-appointments', district, function(err, data) {
                scope.upcomingAppointments = { error: err, data: data, order: 'date' };
              });

              request('/api/missed-appointments', district, function(err, data) {
                scope.missedAppointments = { error: err, data: data, order: 'date' };
              });

              request('/api/upcoming-due-dates', district, function(err, data) {
                scope.upcomingDueDates = { error: err, data: data, order: 'edd' };
              });

              request('/api/high-risk', district, function(err, data) {
                scope.highRisk = { error: err, data: data, order: 'date' };
              });

              request('/api/total-births', district, function(err, data) {
                scope.totalBirths = { error: err, data: data };
              });

              request('/api/missing-delivery-reports', district, function(err, data) {
                scope.missingDeliveryReports = { error: err, data: data, order: 'edd.date' };
              });

              var deliveryCodeMap = {
                F: {
                  label: 'Institutional Delivery',
                  color: '#49A349'
                },
                S: {
                  label: 'At home with SBA',
                  color: '#D19D2E'
                },
                NS: {
                  label: 'At home without SBA',
                  color: '#E33030'
                }
              };
              scope.deliveryCodeChartLabelKey = function() {
                return function(elem) {
                  return translateFilter(deliveryCodeMap[elem.key].label);
                };
              };
              scope.deliveryCodeChartLabelValue = function() {
                return function(elem) {
                  return elem.value;
                };
              };
              scope.deliveryCodeChartColors = function() {
                return function(elem) {
                  // coloring the legend => elem
                  // coloring the chart  => elem.data
                  var data = elem.data || elem;
                  return deliveryCodeMap[data.key].color;
                };
              };
              request('/api/delivery-location', district, function(err, data) {
                scope.deliveryLocation = { error: err, data: data };
              });

              scope.visitsChartLabelKey = function() {
                return function(d) {
                  return translateFilter('Number of visits', { number: d + 1 });
                };
              };
              scope.visitsChartLabelValue = function() {
                return function(d) {
                  return d;
                };
              };
              var visitsMap = ['#E33030', '#DB9A9A', '#9DC49D', '#49A349'];
              scope.visitsChartColors = function() {
                return function(d, i) {
                  return visitsMap[i];
                };
              };

              request('/api/visits-completed', district, function(err, data) {
                scope.visitsCompleted = {
                  error: err,
                  data: [{
                    key: 'item',
                    values: _.map(data, function(d, i) {
                      return [i, d];
                    })
                  }]
                };
              });

              scope.monthlyChartLabelKey = function() {
                return function(d) {
                  return moment()
                    .subtract(12 - d, 'months')
                    .format('MMM YYYY');
                };
              };
              scope.monthlyChartX = function() {
                return function(d, i) {
                  return i;
                };
              };
              scope.monthlyChartY = function() {
                return function(d) {
                  return d.count;
                };
              };
              scope.monthlyChartToolTip = function() {
                return function(key, x, y) {
                  return  '<p>' +
                            translateFilter('Number in month', { count: y, month: x }) +
                          '</p>';
                };
              };

              request('/api/monthly-registrations', district, function(err, data) {
                scope.monthlyRegistrations = {
                  error: err,
                  data: [{
                    key: 'item',
                    values: data
                  }]
                };
              });

              request('/api/monthly-deliveries', district, function(err, data) {
                scope.monthlyDeliveries = {
                  error: err,
                  data: [{
                    key: 'item',
                    values: data
                  }]
                };
              });

            });

          }
        };
      };

      var getTargetsModule = function() {
        return {
          id: 'targets',
          label: 'analytics.targets',
          available: function() {
            // TODO replace this with logic when we have configuration to check
            return true;
          },
          render: function(scope) {
            scope.targets = [];
            var searchScope = {
              filterModel: {
                type: 'contacts',
                contactTypes: [ 'clinic' ]
              },
              filterQuery: ''
            };
            Search(searchScope, { limit: 10000 }, function(err, data) {
              if (err) {
                $log.error('Error fetching number of registrations', err);
                return;
              }
              scope.targets.push({
                name: 'analytics.targets.registrations',
                value: data.length
              });
            });
          }
        };
      };

      var getStockMonitoringModule = function(settings) {
        return {
          id: 'stock',
          label: 'Stock Monitoring',
          available: function() {
            return getScheduledForms(settings).length > 0;
          },
          render: function(scope) {

            scope.facilities = [];
            scope.districts = [];
            scope.filters = {
              time_unit: 'month',
              quantity: 3,
              form: settings['kujua-reporting'][0].code
            };
            scope.forms = getScheduledForms(settings);
            scope.$watch('filters', function() {
              if (scope.district) {
                scope.setDistrict(scope.district);
              }
            }, true);

            scope.expandClinic = function(id) {
              if (scope.expandedClinic === id) {
                scope.expandedClinic = null;
              } else {
                scope.expandedClinic = id;
              }
            };

            scope.expandRecord = function(id) {
              if (!id) {
                return;
              }
              if (scope.expandedRecord === id) {
                scope.expandedRecord = null;
              } else {
                DB.get()
                  .get(id)
                  .then(FormatDataRecord)
                  .then(function(formatted) {
                    $timeout(function() {
                      scope.formattedRecord = formatted[0];
                      scope.expandedRecord = id;
                    });
                  })
                  .catch(function(err) {
                    $log.error('Error getting doc', err);
                  });
              }
            };

            scope.setTime = function(time) {
              scope.filters.time_unit = time.time_unit;
              scope.filters.quantity = time.quantity;
            };

            scope.setForm = function(form) {
              scope.filters.form = form;
            };

            var colours = {
              valid: '#009900',
              invalid: '#990000',
              missing: '#999999'
            };
            scope.colorFunction = function() {
              return function(d) {
                return colours[d.data.key];
              };
            };

            scope.setDistrict = function(district) {
              scope.district = district;
              var dates = stockUtils.getDates(scope.filters);
              DB.get()
                .get(district.id || district._id)
                .then(function(district) {
                  ChildFacility(district, function(err, facilities) {
                    if (err) {
                      return $log.error(err);
                    }
                    getViewReports(DbView, district, dates, function(err, reports) {
                      scope.totals = stockUtils.getTotals(facilities, reports, dates);
                      if (district.type === 'health_center') {
                        scope.clinics = stockUtils.getRowsHC(facilities, reports, dates);
                        _.each(scope.clinics, function(f) {
                          f.chart = [
                            { key: 'valid', y: f.valid_percent },
                            { key: 'missing', y: 100 - f.valid_percent }
                          ];
                        });
                      } else {
                        scope.facilities = stockUtils.getRows(facilities, reports, dates);
                        _.each(scope.facilities, function(f) {
                          f.chart = [
                            { key: 'valid', y: f.valid_percent },
                            { key: 'missing', y: 100 - f.valid_percent }
                          ];
                        });
                      }
                      scope.chart = [
                        { key: 'valid', y: scope.totals.complete },
                        { key: 'missing', y: scope.totals.not_submitted },
                        { key: 'invalid', y: scope.totals.incomplete }
                      ];
                      scope.xFunction = function() {
                        return function(d) {
                          return d.key;
                        };
                      };
                      scope.yFunction = function() {
                        return function(d) {
                          return d.y;
                        };
                      };
                    });
                  });
                })
                .catch(function(err) {
                  $log.error(err);
                });
            };

            UserDistrict(function(err, district) {

              if (err) {
                return $log.error('Error fetching district', err);
              }

              if (district) {
                scope.setDistrict(district);
              } else {
                // national admin
                District(function(err, districts) {
                  if (err) {
                    $log.error(err);
                  }
                  scope.districts = districts;
                });
              }

            });
          }
        };
      };

      var getModules = function(settings) {
        return _.filter([
          getAncModule(settings),
          getStockMonitoringModule(settings),
          getTargetsModule(settings)
        ], function(module) {
          return module.available();
        });
      };

      return function() {
        return SettingsP().then(function(settings) {
          return getModules(settings);
        });
      };
    }
  ]);

  var getScheduledForms = function(settings) {
    var results = [];
    _.each(_.pairs(settings.forms), function(pair) {
      if (_.some(settings['kujua-reporting'], function(report) {
        return report.code === pair[0];
      })) {
        results.push(pair[1]);
      }
    });
    return results;
  };

  var getViewReports = function(DbView, doc, dates, callback) {
    var params = stockUtils.getReportingViewArgs(dates),
        view = 'data_records_by_form_year_month_facility';

    if (dates.reporting_freq === 'week') {
      view = 'data_records_by_form_year_week_facility';
    }

    DbView(view, { params: params }, function(err, data) {
      if (err) {
        return callback('Error fetching reports: '+ err);
      }
      // additional filtering for this facility
      var saved_data = [];
      var idx = doc.type === 'health_center' ? 4 : 3;
      for (var i in data.rows) {
        if (doc._id === data.rows[i].key[idx]) {
          // keep orig ordering
          saved_data.unshift(data.rows[i]);
        }
      }
      callback(null, saved_data);
    });
  };

}());
