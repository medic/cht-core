angular.module('inboxDirectives').directive('mmFreetextFilter', function(SearchFilters) {
  'use strict';
  'ngInject';

  return {
    restrict: 'E',
    templateUrl: 'templates/directives/filters/freetext.html',
    controller: function($ngRedux, $scope, GlobalActions, Selectors) {
      'ngInject';

      const ctrl = this;
      const mapStateToTarget = function(state) {
        return {
          currentTab: Selectors.getCurrentTab(state),
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

      ctrl.inputText = '';
      ctrl.updateFilter = function() {
        ctrl.setFilter({ search: ctrl.inputText });
      };

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
