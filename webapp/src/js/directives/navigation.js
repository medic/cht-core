angular.module('inboxDirectives').directive('mmNavigation', function() {
  'use strict';

  return {
    restrict: 'E',
    templateUrl: 'templates/directives/navigation.html',
    controller: function($ngRedux, $scope) {
      'ngInject';

      var ctrl = this;
      var mapStateToTarget = function(state) {
        return {
          cancelCallback: state.cancelCallback
        };
      };
      var unsubscribe = $ngRedux.connect(mapStateToTarget)(ctrl);

      $scope.$on('$destroy', unsubscribe);
    },
    controllerAs: '$ctrl'
  };
});
