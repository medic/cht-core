angular.module('inboxDirectives').directive('mmNavigation', function() {
  'use strict';

  return {
    restrict: 'E',
    templateUrl: 'templates/directives/filters/navigation.html',
    controller: function($ngRedux, $scope, GlobalActions, Selectors) {
      'ngInject';

      const ctrl = this;
      const mapStateToTarget = function(state) {
        return {
          cancelCallback: Selectors.getCancelCallback(state),
          enketoSaving: Selectors.getEnketoSavingStatus(state),
          title: Selectors.getTitle(state)
        };
      };
      const mapDispatchToTarget = function(dispatch) {
        return GlobalActions(dispatch);
      };
      const unsubscribe = $ngRedux.connect(mapStateToTarget, mapDispatchToTarget)(ctrl);

      $scope.$on('$destroy', unsubscribe);
    },
    controllerAs: 'navigationCtrl'
  };
});
