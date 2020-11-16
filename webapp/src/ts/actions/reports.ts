import { Store, createAction } from '@ngrx/store';
import { createMultiValueAction, createSingleValueAction } from './actionUtils';
import { GlobalActions } from '@mm-actions/global';


export const Actions = {
  selectReport: createMultiValueAction('SELECT_REPORT'),
  setSelected: createSingleValueAction('SET_SELECTED_REPORT', 'selected'),
  addSelectedReport: createSingleValueAction('ADD_SELECTED_REPORT', 'report'),
  removeSelectedReport: createSingleValueAction('REMOVE_SELECTED_REPORT', 'report'),
  setSelectedReports: createSingleValueAction('SET_SELECTED_REPORTS', 'selected'),
  setVerifyingReport: createSingleValueAction('SET_VERIFYING_REPORT', 'verifyingReport'),
  updateSelectedReportItem: createMultiValueAction('UPDATE_SELECTED_REPORT_ITEM'),
  markReportRead: createSingleValueAction('MARK_REPORT_READ', 'id'),

  updateReportsList: createSingleValueAction('UPDATE_REPORTS_LIST', 'reports'),
  removeReportFromList: createSingleValueAction('REMOVE_REPORT_FROM_LIST', 'report'),
  resetReportsList: createAction('RESET_REPORTS_LIST'),

  setRightActionBar: createAction('SET_RIGHT_ACTION_BAR_REPORTS'),
  setTitle: createSingleValueAction('SET_REPORTS_TITLE', 'selected'),
  setSelectMode: createSingleValueAction('SET_REPORTS_SELECT_MODE', 'selectMode'),
};

export class ReportsActions {
  constructor(private store: Store) {}

  addSelectedReport(selected) {
    return this.store.dispatch(Actions.addSelectedReport(selected));
  }

  selectReport(id, { silent=false }={}) {
    return this.store.dispatch(Actions.selectReport({ id, silent }));
  }

  removeSelectedReport(id) {
    this.store.dispatch(Actions.removeSelectedReport(id));
    const globalActions = new GlobalActions(this.store);
    globalActions.settingSelected();
    this.setRightActionBar();
  }

  setSelectedReports(selected) {
    return this.store.dispatch(Actions.setSelectedReports(selected));
  }

  updateReportsList(reports) {
    return this.store.dispatch(Actions.updateReportsList(reports));
  }

  removeReportFromList(report) {
    return this.store.dispatch(Actions.removeReportFromList(report));
  }

  resetReportsList() {
    return this.store.dispatch(Actions.resetReportsList());
  }

  setSelected(model) {
    return this.store.dispatch(Actions.setSelected(model));
  }

  setVerifyingReport(verifyingReport) {
    return this.store.dispatch(Actions.setVerifyingReport(verifyingReport));
  }

  setRightActionBar() {
    return this.store.dispatch(Actions.setRightActionBar());
  }

  setTitle(selected) {
    return this.store.dispatch(Actions.setTitle(selected));
  }

  markReportRead(id) {
    return this.store.dispatch(Actions.markReportRead(id));
  }

  clearSelection() {
    this.store.dispatch(Actions.setSelectedReports([]));
    // setVerifyingReport(false);
    // setCheckboxElements(false);
  }

  setSelectMode(value) {
    return this.store.dispatch(Actions.setSelectMode(value));
  }

  updateSelectedReportItem(id, selected) {
    return this.store.dispatch(Actions.updateSelectedReportItem({ id, selected }));
  }

  deselectAll() {
    this.store.dispatch(Actions.setSelectedReports([]));
    this.setRightActionBar();
    //setCheckboxElements(false);
  }
}
/*

angular.module('inboxServices').factory('ReportsActions',
  function(
    $log,
    $state,
    $translate,
    ActionUtils,
    Auth,
    DB,
    GlobalActions,
    LiveList,
    MarkRead,
    Modal,
    ReportViewModelGenerator,
    Search,
    Selectors,
    ServicesActions
  ) {
    'use strict';
    'ngInject';

    return function(dispatch) {

      const globalActions = GlobalActions(dispatch);
      const servicesActions = ServicesActions(dispatch);

      function setFirstSelectedReportDocProperty(doc) {
        dispatch(ActionUtils.createSingleValueAction(actionTypes.SET_FIRST_SELECTED_REPORT_DOC_PROPERTY, 'doc', doc));
      }

      function setFirstSelectedReportFormattedProperty(formatted) {
        dispatch(ActionUtils.createSingleValueAction(
          actionTypes.SET_FIRST_SELECTED_REPORT_FORMATTED_PROPERTY, 'formatted', formatted
        ));
      }

      function toggleVerifyingReport() {
        dispatch((dispatch, getState) => {
          const verifyingReport = Selectors.getVerifyingReport(getState());
          setVerifyingReport(!verifyingReport);
          setRightActionBar();
        });
      }



      function selectAll() {
        dispatch((dispatch, getState) => {
          globalActions.setLoadingShowContent(true);
          const filters = Selectors.getFilters(getState());
          Search('reports', filters, { limit: 500, hydrateContactNames: true })
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
              setSelectedReports(selected);
              globalActions.settingSelected(true);
              setRightActionBar();
              setCheckboxElements(true);
            })
            .catch(err => $log.error('Error selecting all', err));
        });
      }

      function verifyReport(reportIsVerified) {
        dispatch((dispatch, getState) => {

          const getFirstSelected = () => Selectors.getSelectedReports(getState())[0];

          if (!getFirstSelected().doc.form) {
            return;
          }

          globalActions.setLoadingSubActionBar(true);

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
            const docHasExistingResult = getFirstSelected().doc.verified !== undefined;
            if (docHasExistingResult) {
              return false;
            }

            // verify if this is not an edit and the user accepts  prompt
            return promptUserToConfirmVerification();
          };

          const writeVerificationToDoc = () => {
            if (getFirstSelected().doc.contact) {
              const minifiedContact = lineageFactory().minifyLineage(getFirstSelected().doc.contact);
              setFirstSelectedReportDocProperty({ contact: minifiedContact });
            }

            const clearVerification = getFirstSelected().doc.verified === reportIsVerified;
            if (clearVerification) {
              setFirstSelectedReportDocProperty({
                verified: undefined,
                verified_date: undefined,
              });
            } else {
              setFirstSelectedReportDocProperty({
                verified: reportIsVerified,
                verified_date: Date.now(),
              });
            }
            servicesActions.setLastChangedDoc(getFirstSelected().doc);

            return DB()
              .get(getFirstSelected().doc._id)
              .then(existingRecord => {
                setFirstSelectedReportDocProperty({ _rev: existingRecord._rev });
                return DB().post(getFirstSelected().doc);
              })
              .catch(err => $log.error('Error verifying message', err))
              .finally(() => {
                const oldVerified = getFirstSelected().formatted.verified;
                const newVerified = oldVerified === reportIsVerified ? undefined : reportIsVerified;
                setFirstSelectedReportFormattedProperty({ verified: newVerified, oldVerified: oldVerified });
                globalActions.setRightActionBarVerified(newVerified);
              });
          };

          globalActions.setLoadingSubActionBar(true);
          Auth.has('can_edit_verification')
            .then(canUserEditVerifications => shouldReportBeVerified(canUserEditVerifications))
            .then(shouldVerify => {
              if (shouldVerify) {
                return writeVerificationToDoc();
              }
            })
            .catch(err => $log.error(`Error verifying message: ${err}`))
            .finally(() => globalActions.setLoadingSubActionBar(false));
        });
      }

      function launchEditFacilityDialog() {
        dispatch((dispatch, getState) => {
          const selectedReports = Selectors.getSelectedReports(getState());
          Modal({
            templateUrl: 'templates/modals/edit_report.html',
            controller: 'EditReportCtrl',
            controllerAs: 'editReportCtrl',
            model: { report: selectedReports[0].doc },
          });
        });
      }

      const setCheckboxElements = value => {
        $('#reports-list input[type="checkbox"]').prop('checked', value);
      };

      return {
        addSelectedReport,
        clearSelection,
        deselectAll,
        removeSelectedReport,
        launchEditFacilityDialog,
        selectAll,
        selectReport,
        setFirstSelectedReportDocProperty,
        setFirstSelectedReportFormattedProperty,
        setRightActionBar,
        setSelect,
        setSelected,
        setSelectedReports,
        setTitle,
        setVerifyingReport,
        toggleVerifyingReport,
        updateSelectedReportItem,
        verifyReport,
      };
    };
  }
);
*/
