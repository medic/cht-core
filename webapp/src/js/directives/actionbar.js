angular.module('inboxDirectives').directive('mmActionbar', function() {
  'use strict';

  return {
    restrict: 'E',
    templateUrl: 'templates/directives/actionbar.html',
    controller: function(
      $ngRedux,
      $scope,
      ReportsActions,
      Selectors
    ) {
      'ngInject';

      const ctrl = this;
      const mapStateToTarget = state => {
        return {
          actionBar: Selectors.getActionBar(state),
          currentTab: Selectors.getCurrentTab(state),
          filters: Selectors.getFilters(state),
          isAdmin: Selectors.getIsAdmin(state),
          loadingContent: Selectors.getLoadingContent(state),
          loadingSubActionBar: Selectors.getLoadingSubActionBar(state),
          selectMode: Selectors.getSelectMode(state),
          selectedContactDoc: Selectors.getSelectedContactDoc(state),
          selectedReports: Selectors.getSelectedReports(state),
          selectedReportsDocs: Selectors.getSelectedReportsDocs(state),
          showActionBar: Selectors.getShowActionBar(state),
        };
      };
      const mapDispatchToTarget = dispatch => {
        const reportsActions = ReportsActions(dispatch);
        return {
          deselectAll: reportsActions.deselectAll,
          launchEditFacilityDialog: reportsActions.launchEditFacilityDialog,
          selectAll: reportsActions.selectAll,
          setSelect: reportsActions.setSelect,
          toggleVerifyingReport: reportsActions.toggleVerifyingReport,
          verifyReport: reportsActions.verifyReport,
        };
      };
      const unsubscribe = $ngRedux.connect(mapStateToTarget, mapDispatchToTarget)(ctrl);

      $scope.$on('$destroy', unsubscribe);
    },
    controllerAs: 'actionBarCtrl',
    bindToController: {
      nonContactForms: '<'
    }
  };
});
