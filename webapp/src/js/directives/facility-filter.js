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
          selectMode: Selectors.getSelectMode(state),
          selected: Selectors.getSelected(state)
        };
      };
      var unsubscribe = $ngRedux.connect(mapStateToTarget)(ctrl);

      $scope.$on('$destroy', unsubscribe);
    },
    controllerAs: '$ctrl',
    link: function(scope) {
      SearchFilters.facility(function(facilities) {
        scope.filters.facilities = facilities;
        scope.search();
      });
    }
  };
});
