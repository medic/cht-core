angular.module('inboxDirectives').directive('mmFormTypeFilter', function(SearchFilters) {
  'use strict';
  'ngInject';

  return {
    restrict: 'E',
    templateUrl: 'templates/directives/filters/form_type.html',
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
    controllerAs: 'formTypeFilterCtrl',
    bindToController: {
      search: '<',
      selected: '<'
    },
    link: function(scope, e, a, controller) {
      SearchFilters.formType(function(forms) {
        scope.filters.forms = forms;
        controller.search();
      });
    }
  };
});
