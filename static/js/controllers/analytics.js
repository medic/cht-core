var _ = require('underscore'),
    tour = require('../modules/tour'),
    format = require('../modules/format');

(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  var findSelectedModule = function(id, modules) {
    if (!modules.length) {
      return undefined;
    }
    if (!id) {
      return modules[0];
    }
    return _.findWhere(modules, { id: id });
  };

  inboxControllers.controller('AnalyticsCtrl',
    ['$scope', '$route', '$location', '$log', 'Settings', 'AnalyticsModules', 'FacilityRaw', 'Form',
    function ($scope, $route, $location, $log, Settings, AnalyticsModules, FacilityRaw, Form) {

      //debugger;
      $log.debug('AnalyticsCtrl');
      $log.debug('$route', $route.current.params);
      $scope.setSelectedModule();
      $scope.loading = true;
      $scope.filterModel.type = 'analytics';
      if ($route.current.params.form) {
        $scope.filterModel.selectedForm = $route.current.params.form;
      }
      if ($route.current.params.facility) {
        $scope.filterModel.selectedFacility = $route.current.params.facility;
      }
      $log.debug('AnalyticsCtrl init $scope.filterModel', $scope.filterModel);
      var updateFilters = function() {
        console.log('analytics.updateAvailableFacilities $scope.permissions', $scope.permissions);
        FacilityRaw($scope.permissions.district).query(
          function(res) {
            $scope.facilities = res;
            console.log('facilities', res);
            res.forEach(function(row) {
            });
            /*
            function formatResult(row) {
              return format.contact(row.doc);
            }
            $('#update-facility [name=facility]').select2({
              width: '100%',
              escapeMarkup: function(m) {
                return m;
              },
              formatResult: formatResult,
              formatSelection: formatResult,
              initSelection: function (element, callback) {
                var e = element.val();
                if (!e) {
                  return callback();
                }
                var row = _.findWhere(res, { id: e });
                if (!row) {
                  return callback();
                }
                callback(row);
              },
              query: function(options) {
                var terms = options.term.toLowerCase().split(/\s+/);
                var matches = _.filter(res, function(val) {
                  var contact = val.doc.contact;
                  var name = contact && contact.name;
                  var phone = contact && contact.phone;
                  var tags = [ val.doc.name, name, phone ].join(' ').toLowerCase();
                  return _.every(terms, function(term) {
                    return tags.indexOf(term) > -1;
                  });
                });
                options.callback({ results: matches });
              },
              sortResults: function(results) {
                results.sort(function(a, b) {
                  var aName = formatResult(a).toLowerCase();
                  var bName = formatResult(b).toLowerCase();
                  return aName.localeCompare(bName);
                });
                return results;
              }
            });
            */
          },
          function() {
            console.log('Failed to retrieve facilities');
          }
        );
      };
      Form().then(
        function(forms) {
          $scope.forms = forms;
        },
        function(err) {
          console.log('Failed to retrieve forms', err);
        }
      );
      Settings(function(err, res) {
        if (err) {
          return console.log('Error fetching settings', err);
        }
        //$log.log('Settings res', res);
        $scope.setAnalyticsModules(AnalyticsModules(res));
        $scope.setSelectedModule(findSelectedModule(
          $route.current.params.module, $scope.analyticsModules
        ));
        $scope.loading = false;
        //debugger;
        if ($scope.filterModel.module) {
          if ($scope.filterModel.selectedForm && $scope.filterModel.selectedFacility) {
            $scope.filterModel.module.renderFacility(
              $scope.filterModel.selectedForm,
              $scope.filterModel.selectedFacility
            );
          } else {
            $scope.filterModel.module.render($scope);
          }
          // why is render on this property?
          //console.log('$scope.facilities', $scope.facilities);
          //updateFilters();
          /*
          $scope.siblings.districts = getSiblings($scope, district);
          if ($route.params.health_centers) {
            $scope.siblings = getSiblings($scope, district);
          }
          */
        }
      });
      tour.start($route.current.params.tour);
      $location.url($location.path());
    }
  ]);

}());
