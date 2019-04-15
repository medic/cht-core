angular.module('inboxDirectives').directive('mmFormTypeFilter', function(SearchFilters) {
  'use strict';
  'ngInject';

  return {
    restrict: 'E',
    templateUrl: 'templates/directives/filters/form_type.html',
    controller: function($ngRedux, $scope, Selectors) {
      'ngInject';

      var ctrl = this;
      var mapStateToTarget = function(state) {
        return {
          selectMode: Selectors.getSelectMode(state)
        };
      };
      var unsubscribe = $ngRedux.connect(mapStateToTarget)(ctrl);

      $scope.$on('$destroy', unsubscribe);
    },
    controllerAs: 'formTypeFilterCtrl',
    bindToController: {
      selected: '<'
    },
    link: function(scope) {
      SearchFilters.formType(function(forms) {
        scope.filters.forms = forms;
        scope.search();
      });
    }
  };
});
