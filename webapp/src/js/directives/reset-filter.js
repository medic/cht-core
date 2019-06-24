angular.module('inboxDirectives').directive('mmResetFilter', function() {
  'use strict';

  return {
    restrict: 'E',
    templateUrl: 'templates/directives/filters/reset.html',
    controller: function($ngRedux, $scope, Selectors) {
      'ngInject';

      var ctrl = this;
      var mapStateToTarget = function(state) {
        return {
          selectMode: Selectors.getSelectMode(state),
          selected: Selectors.getSelected(state)
        };
      };
      var unsubscribe = $ngRedux.connect(mapStateToTarget)(ctrl);

      $scope.$on('$destroy', unsubscribe);
    },
    controllerAs: 'resetFilterCtrl'
  };
});
