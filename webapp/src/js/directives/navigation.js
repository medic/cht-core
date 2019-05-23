angular.module('inboxDirectives').directive('mmNavigation', function() {
  'use strict';

  return {
    restrict: 'E',
    templateUrl: 'templates/directives/filters/navigation.html',
    controller: function($ngRedux, $scope, Selectors) {
      'ngInject';

      var ctrl = this;
      var mapStateToTarget = function(state) {
        return {
          cancelCallback: Selectors.getCancelCallback(state),
          enketoSaving: Selectors.getEnketoSavingStatus(state)
        };
      };
      var unsubscribe = $ngRedux.connect(mapStateToTarget)(ctrl);

      $scope.$on('$destroy', unsubscribe);
    },
    controllerAs: '$ctrl'
  };
});
