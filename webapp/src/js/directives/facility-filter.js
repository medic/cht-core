angular.module('inboxDirectives').directive('mmFacilityFilter', function(SearchFilters) {
  'use strict';
  'ngInject';

  return {
    restrict: 'E',
    templateUrl: 'templates/directives/filters/facility.html',
    controller: function($ngRedux, $scope, Selectors) {
      'ngInject';

      var ctrl = this;
      var mapStateToTarget = function(state) {
        return {
          facilities: Selectors.getFacilities(state),
          isAdmin: Selectors.getIsAdmin(state),
          selectMode: Selectors.getSelectMode(state)
        };
      };
      var unsubscribe = $ngRedux.connect(mapStateToTarget)(ctrl);

      $scope.$on('$destroy', unsubscribe);
    },
    controllerAs: 'facilityFilterCtrl',
    bindToController: {
      selected: '<'
    },
    link: function(scope) {
      SearchFilters.facility(function(facilities) {
        scope.filters.facilities = facilities;
        scope.search();
      });
    }
  };
});
