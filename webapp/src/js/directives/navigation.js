angular.module('inboxDirectives').directive('mmNavigation', function() {
  'use strict';

  return {
    restrict: 'E',
    templateUrl: 'templates/directives/filters/navigation.html',
    controller: function(
      $ngRedux,
      $scope,
      $state,
      $stateParams,
      GlobalActions,
      Selectors
    ) {
      'ngInject';

      const ctrl = this;
      const mapStateToTarget = state => {
        return {
          cancelCallback: Selectors.getCancelCallback(state),
          enketoSaving: Selectors.getEnketoSavingStatus(state),
          title: Selectors.getTitle(state)
        };
      };
      const mapDispatchToTarget = function(dispatch) {
        const globalActions = GlobalActions(dispatch);
        return {
          navigationCancel: globalActions.navigationCancel,
          unsetSelected: globalActions.unsetSelected
        };
      };
      const unsubscribe = $ngRedux.connect(mapStateToTarget, mapDispatchToTarget)(ctrl);

      /**
       * Navigate back to the previous view
       */
      ctrl.navigateBack = () => {
        if ($state.current.name === 'contacts.deceased') {
          $state.go('contacts.detail', { id: $stateParams.id });
        } else if ($stateParams.id) {
          $state.go($state.current.name, { id: null });
        } else {
          ctrl.unsetSelected();
        }
      };

      $scope.$on('$destroy', unsubscribe);
    },
    controllerAs: 'navigationCtrl'
  };
});
