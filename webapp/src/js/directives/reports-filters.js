angular.module('inboxDirectives').directive('mmReportsFilters', function() {
  'use strict';
  'ngInject';

  return {
    restrict: 'E',
    templateUrl: 'templates/directives/reports_filters.html',
    controller: function($ngRedux, $scope, Selectors) {
      'ngInject';

      const ctrl = this;
      const mapStateToTarget = function(state) {
        return {
          selectedReports: Selectors.getSelectedReports(state)
        };
      };
      const unsubscribe = $ngRedux.connect(mapStateToTarget)(ctrl);

      $scope.$on('$destroy', unsubscribe);
    },
    controllerAs: 'reportsFiltersCtrl'
  };
});
