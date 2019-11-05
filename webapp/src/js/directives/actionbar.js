angular.module('inboxDirectives').directive('mmActionbar', function() {
  'use strict';

  return {
    restrict: 'E',
    templateUrl: 'templates/directives/actionbar.html',
    controller: function(
      $ngRedux,
      $scope,
      $state,
      GlobalActions,
      Selectors
    ) {
      'ngInject';

      const ctrl = this;
      const mapStateToTarget = function(state) {
        return {
          actionBar: Selectors.getActionBar(state),
          currentTab: Selectors.getCurrentTab(state),
          isAdmin: Selectors.getIsAdmin(state),
          loadingContent: Selectors.getLoadingContent(state),
          loadingSubActionBar: Selectors.getLoadingSubActionBar(state),
          selectMode: Selectors.getSelectMode(state),
          selectedContactDoc: Selectors.getSelectedContactDoc(state),
          selectedReportsDocs: Selectors.getSelectedReportsDocs(state),
          showActionBar: Selectors.getShowActionBar(state)
        };
      };
      const mapDispatchToTarget = function(dispatch) {
        const globalActions = GlobalActions(dispatch);
        return {
          setSelectMode: globalActions.setSelectMode,
          unsetSelected: globalActions.unsetSelected
        };
      };
      const unsubscribe = $ngRedux.connect(mapStateToTarget, mapDispatchToTarget)(ctrl);

      ctrl.setSelect = value => {
        ctrl.setSelectMode(value);
        ctrl.unsetSelected();
        $state.go('reports.detail', { id: null });
      };

      $scope.$on('$destroy', unsubscribe);
    },
    controllerAs: 'actionBarCtrl',
    bindToController: {
      nonContactForms: '<'
    }
  };
});
