angular.module('inboxDirectives').directive('mmStatusFilter', function(SearchFilters) {
  'use strict';
  'ngInject';

  return {
    restrict: 'E',
    templateUrl: 'templates/directives/filters/status.html',
    controller: function($ngRedux, $scope) {
      'ngInject';

      var ctrl = this;
      var mapStateToTarget = function(state) {
        return {
          selectMode: state.selectMode
        };
      };
      var unsubscribe = $ngRedux.connect(mapStateToTarget)(ctrl);

      $scope.$on('$destroy', unsubscribe);
    },
    controllerAs: '$ctrl',
    link: function(scope) {
      SearchFilters.status(function(status) {
        scope.filters.valid = status.valid;
        scope.filters.verified = status.verified;
        scope.search();
      });
    }
  };
});
