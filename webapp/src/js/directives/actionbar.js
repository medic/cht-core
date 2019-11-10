const lineageFactory = require('@medic/lineage');

angular.module('inboxDirectives').directive('mmActionbar', function() {
  'use strict';

  return {
    restrict: 'E',
    templateUrl: 'templates/directives/actionbar.html',
    controller: function(
      $log,
      $ngRedux,
      $scope,
      $state,
      $translate,
      Auth,
      DB,
      GlobalActions,
      Modal,
      ReportsActions,
      Search,
      Selectors,
      ServicesActions
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
        const globalActions = GlobalActions(dispatch);
        const reportsActions = ReportsActions(dispatch);
        const servicesActions = ServicesActions(dispatch);
        return {
          deselectAll: reportsActions.deselectAll,
          setFirstSelectedReportDocProperty: reportsActions.setFirstSelectedReportDocProperty,
          setFirstSelectedReportFormattedProperty: reportsActions.setFirstSelectedReportFormattedProperty,
          setLastChangedDoc: servicesActions.setLastChangedDoc,
          setLoadingShowContent: globalActions.setLoadingShowContent,
          setLoadingSubActionBar: globalActions.setLoadingSubActionBar,
          setRightActionBar: reportsActions.setRightActionBar,
          setRightActionBarVerified: globalActions.setRightActionBarVerified,
          setSelectedReports: reportsActions.setSelectedReports,
          setSelectMode: globalActions.setSelectMode,
          settingSelected: globalActions.settingSelected,
          toggleVerifyingReport: reportsActions.toggleVerifyingReport,
          unsetSelected: globalActions.unsetSelected,
        };
      };
      const unsubscribe = $ngRedux.connect(mapStateToTarget, mapDispatchToTarget)(ctrl);

      ctrl.setSelect = value => {
        ctrl.setSelectMode(value);
        ctrl.unsetSelected();
        $state.go('reports.detail', { id: null });
      };

      ctrl.selectAll = () => {
        ctrl.setLoadingShowContent(true);
        Search('reports', ctrl.filters, { limit: 500, hydrateContactNames: true })
          .then(summaries => {
            const selected = summaries.map(summary => {
              return {
                _id: summary._id,
                summary: summary,
                expanded: false,
                lineage: summary.lineage,
                contact: summary.contact,
              };
            });
            ctrl.setSelectedReports(selected);
            ctrl.settingSelected(true);
            ctrl.setRightActionBar();
            $('#reports-list input[type="checkbox"]').prop('checked', true);
          })
          .catch(function(err) {
            $log.error('Error selecting all', err);
          });
      };

      ctrl.verifyReport = reportIsVerified => {

        if (!ctrl.selectedReports[0].doc.form) {
          return;
        }

        ctrl.setLoadingSubActionBar(true);

        const promptUserToConfirmVerification = () => {
          const verificationTranslationKey = reportIsVerified ? 'reports.verify.valid' : 'reports.verify.invalid';
          return Modal({
            templateUrl: 'templates/modals/verify_confirm.html',
            controller: 'VerifyReportModalCtrl',
            model: {
              proposedVerificationState: $translate.instant(verificationTranslationKey),
            },
          })
          .then(() => true)
          .catch(() => false);
        };

        const shouldReportBeVerified = canUserEdit => {
          // verify if user verifications are allowed
          if (canUserEdit) {
            return true;
          }

          // don't verify if user can't edit and this is an edit
          const docHasExistingResult = ctrl.selectedReports[0].doc.verified !== undefined;
          if (docHasExistingResult) {
            return false;
          }

          // verify if this is not an edit and the user accepts  prompt
          return promptUserToConfirmVerification();
        };

        const writeVerificationToDoc = () => {
          if (ctrl.selectedReports[0].doc.contact) {
            const minifiedContact = lineageFactory().minifyLineage(ctrl.selectedReports[0].doc.contact);
            ctrl.setFirstSelectedReportDocProperty({ contact: minifiedContact });
          }

          const clearVerification = ctrl.selectedReports[0].doc.verified === reportIsVerified;
          if (clearVerification) {
            ctrl.setFirstSelectedReportDocProperty({
              verified: undefined,
              verified_date: undefined,
            });
          } else {
            ctrl.setFirstSelectedReportDocProperty({
              verified: reportIsVerified,
              verified_date: Date.now(),
            });
          }
          ctrl.setLastChangedDoc(ctrl.selectedReports[0].doc);

          return DB()
            .get(ctrl.selectedReports[0].doc._id)
            .then(existingRecord => {
              ctrl.setFirstSelectedReportDocProperty({ _rev: existingRecord._rev });
              return DB().post(ctrl.selectedReports[0].doc);
            })
            .catch(err => {
              $log.error('Error verifying message', err);
            })
            .finally(() => {
              const oldVerified = ctrl.selectedReports[0].formatted.verified;
              const newVerified = oldVerified === reportIsVerified ? undefined : reportIsVerified;
              ctrl.setFirstSelectedReportFormattedProperty({ verified: newVerified, oldVerified: oldVerified });
              ctrl.setRightActionBarVerified(newVerified);
            });
        };

        ctrl.setLoadingSubActionBar(true);
        Auth('can_edit_verification')
          .then(() => true)
          .catch(() => false)
          .then(canUserEditVerifications => shouldReportBeVerified(canUserEditVerifications))
          .then(shouldVerify => {
            if (shouldVerify) {
              return writeVerificationToDoc();
            }
          })
          .catch(err => $log.error(`Error verifying message: ${err}`))
          .finally(() => ctrl.setLoadingSubActionBar(false));
      };

      ctrl.launchEditFacilityDialog = () => {
        Modal({
          templateUrl: 'templates/modals/edit_report.html',
          controller: 'EditReportCtrl',
          controllerAs: 'editReportCtrl',
          model: { report: ctrl.selectedReports[0].doc },
        });
      };

      $scope.$on('$destroy', unsubscribe);
    },
    controllerAs: 'actionBarCtrl',
    bindToController: {
      nonContactForms: '<'
    }
  };
});
