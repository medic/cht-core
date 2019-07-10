angular.module('inboxDirectives').directive('mmDateFilter', function(SearchFilters) {
  'use strict';
  'ngInject';

  return {
    restrict: 'E',
    templateUrl: 'templates/directives/filters/date.html',
    controller: function($ngRedux, $scope, Selectors) {
      'ngInject';

      const ctrl = this;
      const mapStateToTarget = function(state) {
        return {
          selectMode: Selectors.getSelectMode(state)
        };
      };
      const unsubscribe = $ngRedux.connect(mapStateToTarget)(ctrl);

      $scope.$on('$destroy', unsubscribe);
    },
    controllerAs: 'dateFilterCtrl',
    bindToController: {
      selected: '<'
    },
    link: function(scope) {
      SearchFilters.date(function(date) {
        scope.filters.date = date;
        scope.search();
      });
    }
  };
});
