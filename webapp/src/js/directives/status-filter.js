angular.module('inboxDirectives').directive('mmStatusFilter', function(SearchFilters) {
  'use strict';
  'ngInject';

  return {
    restrict: 'E',
    templateUrl: 'templates/directives/filters/status.html',
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
    controllerAs: 'statusFilterCtrl',
    bindToController: {
      search: '<',
      selected: '<'
    },
    link: function(scope, e, a, controller) {
      SearchFilters.status(function(status) {
        scope.filters.valid = status.valid;
        scope.filters.verified = status.verified;
        controller.search();
      });
    }
  };
});
