angular.module('inboxDirectives').directive('mmFormTypeFilter', function() {
  'use strict';

  return {
    restrict: 'E',
    templateUrl: 'templates/directives/filters/form_type.html',
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
    link: function(scope, element) {
      element.on('load', function() {
        console.log(scope);
        console.log(scope.setupSearchFormType);
      });
    }
  };
});
