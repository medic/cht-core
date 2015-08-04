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
        FacilityRaw($scope.permissions.district).query(
          function(res) {
            $scope.facilities = res;
            console.log('facilities', res);
            res.forEach(function(row) {
            });
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
          return $log.error('Error fetching settings: ', err);
        }
        $scope.setAnalyticsModules(AnalyticsModules(res));
        $scope.setSelectedModule(findSelectedModule(
          $route.current.params.module, $scope.analyticsModules
        ));
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
        $scope.loading = false;
      });
      tour.start($route.current.params.tour);
      $location.url($location.path());
    }
  ]);

}());
