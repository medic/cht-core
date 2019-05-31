angular.module('inboxDirectives').directive('mmDateFilter', function(SearchFilters) {
  'use strict';
  'ngInject';

  return {
    restrict: 'E',
    templateUrl: 'templates/directives/filters/date.html',
    controller: function($ngRedux, $scope, GlobalActions, Selectors) {
      'ngInject';

      const ctrl = this;
      const mapStateToTarget = function(state) {
        return {
          filters: Selectors.getFilters(state),
          selectMode: Selectors.getSelectMode(state)
        };
      };
      const mapDispatchToTarget = function(dispatch) {
        const globalActions = GlobalActions(dispatch);
        return {
          setFilter: globalActions.setFilter
        };
      };
      const unsubscribe = $ngRedux.connect(mapStateToTarget, mapDispatchToTarget)(ctrl);

      $scope.$on('$destroy', unsubscribe);
    },
    controllerAs: 'dateFilterCtrl',
    bindToController: {
      search: '<',
      selected: '<'
    },
    link: function(s, e, a, controller) {
      SearchFilters.date(function(date) {
        controller.setFilter({ date });
        controller.search();
      });
    }
  };
});
