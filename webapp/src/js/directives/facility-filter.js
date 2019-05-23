angular.module('inboxDirectives').directive('mmFacilityFilter', function(SearchFilters) {
  'use strict';
  'ngInject';

  return {
    restrict: 'E',
    templateUrl: 'templates/directives/filters/facility.html',
    controller: function($ngRedux, $scope, Selectors) {
      'ngInject';

      const ctrl = this;
      const mapStateToTarget = function(state) {
        return {
          facilities: Selectors.getFacilities(state),
          isAdmin: Selectors.getIsAdmin(state),
          selectMode: Selectors.getSelectMode(state)
        };
      };
      const unsubscribe = $ngRedux.connect(mapStateToTarget)(ctrl);

      $scope.$on('$destroy', unsubscribe);
    },
    controllerAs: 'facilityFilterCtrl',
    bindToController: {
      search: '<',
      selected: '<'
    },
    link: function(scope, e, a, controller) {
      SearchFilters.facility(function(facilities) {
        scope.filters.facilities = facilities;
        controller.search();
      });
    }
  };
});
