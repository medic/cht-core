angular.module('inboxDirectives').directive('mmFreetextFilter', function(SearchFilters) {
  'use strict';
  'ngInject';

  return {
    restrict: 'E',
    templateUrl: 'templates/directives/filters/freetext.html',
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
    controllerAs: 'freetextFilterCtrl',
    bindToController: {
      search: '<',
      selected: '<'
    },
    link: function(s, e, a, controller) {
      SearchFilters.freetext(controller.search);
    }
  };
});
