angular.module('inboxDirectives').directive('mmActionbar', function() {
  'use strict';

  return {
    restrict: 'E',
    templateUrl: 'templates/directives/actionbar.html',
    controller: function(
      $log,
      $ngRedux,
      $scope,
      GlobalActions,
      Modal,
      ReportsActions,
      TrainingsActions,
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
          selectedTrainings: Selectors.getSelectedTrainings(state),
          selectedTrainingsDocs: Selectors.getSelectedTrainingsDocs(state),
          showActionBar: Selectors.getShowActionBar(state),
        };
      };
      const mapDispatchToTarget = dispatch => {
        const globalActions = GlobalActions(dispatch);
        const reportsActions = ReportsActions(dispatch);
        const trainingsActions = TrainingsActions(dispatch);
        return {
          deleteDoc: globalActions.deleteDoc,
          deselectAll: reportsActions.deselectAll,
          launchEditFacilityDialog: reportsActions.launchEditFacilityDialog,
          selectAll: reportsActions.selectAll,
          setSelect: reportsActions.setSelect,
          toggleVerifyingReport: reportsActions.toggleVerifyingReport,
          verifyReport: reportsActions.verifyReport,
      /*  deselectAll: trainingsActions.deselectAll,
          launchEditFacilityDialog: trainingsActions.launchEditFacilityDialog,
          selectAll: trainingsActions.selectAll,
          setSelect: trainingsActions.setSelect, */
          toggleVerifyingTraining: trainingsActions.toggleVerifyingTraining,
          verifyTraining: trainingsActions.verifyTraining,
        };
      };
      const unsubscribe = $ngRedux.connect(mapStateToTarget, mapDispatchToTarget)(ctrl);

      ctrl.bulkDelete = docs => {
        if (!docs) {
          $log.warn('Trying to delete empty object', docs);
          return;
        }
        if (!docs.length) {
          $log.warn('Trying to delete empty array', docs);
          return;
        }
        Modal({
          templateUrl: 'templates/modals/bulk_delete_confirm.html',
          controller: 'BulkDeleteConfirm',
          controllerAs: 'bulkDeleteConfirmCtrl',
          model: { docs },
        }).catch(() => {}); // modal dismissed is ok
      };

      $scope.$on('$destroy', unsubscribe);
    },
    controllerAs: 'actionBarCtrl',
    bindToController: {
      nonContactForms: '<'
    }
  };
});
