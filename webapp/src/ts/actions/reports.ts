import { Store, createAction } from '@ngrx/store';
import { createSingleValueAction } from './actionUtils';

export const Actions = {
  addSelectedReport: createSingleValueAction('ADD_SELECTED_REPORT', 'selected'),
  removeSelectedReport: createSingleValueAction('REMOVE_SELECTED_REPORT', 'id'),
  setSelectedReports: createSingleValueAction('SET_SELECTED_REPORTS', 'selected'),

  updateReportsList: createSingleValueAction('UPDATE_REPORTS_LIST', 'reports'),
  removeReportFromList: createSingleValueAction('REMOVE_REPORT_FROM_LIST', 'report'),
  resetReportsList: createAction('RESET_REPORTS_LIST'),
};

export class ReportsActions {
  constructor(private store: Store) {}

  addSelectedReport(selected) {
    return this.store.dispatch(Actions.addSelectedReport(selected));
  }

  removeSelectedReport(id) {
    /*
     dispatch(ActionUtils.createSingleValueAction(actionTypes.REMOVE_SELECTED_REPORT, 'id', id));
     setRightActionBar();
     globalActions.settingSelected(true);
     $(`#reports-list li[data-record-id="${id}"] input[type="checkbox"]`).prop('checked', false);
     */
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

      function setSelectedReports(selected) {
        dispatch(ActionUtils.createSingleValueAction(actionTypes.SET_SELECTED_REPORTS, 'selected', selected));
      }

      function setVerifyingReport(verifyingReport) {
        dispatch(ActionUtils.createSingleValueAction(
          actionTypes.SET_VERIFYING_REPORT, 'verifyingReport', verifyingReport
        ));
      }

      function updateSelectedReportItem(id, selected) {
        dispatch({
          type: actionTypes.UPDATE_SELECTED_REPORT_ITEM,
          payload: { id, selected }
        });
      }

      function setTitle(model) {
        dispatch(function(dispatch, getState) {
          const formInternalId = model.formInternalId || model.form;
          const forms = Selectors.getForms(getState());
          const form = _.find(forms, { code: formInternalId });
          const name = (form && form.name) || (form && form.title) || model.form;
          globalActions.setTitle(name);
        });
      }

      function getContact(id) {
        return DB().get(id)
          // log the error but continue anyway
          .catch(err => $log.error('Error fetching contact for action bar', err));
      }

      function setRightActionBar() {
        dispatch(function(dispatch, getState) {
          const selectMode = Selectors.getSelectMode(getState());
          const selectedReportsDocs = Selectors.getSelectedReportsDocs(getState());
          const model = {};
          const doc =
            !selectMode &&
            selectedReportsDocs &&
            selectedReportsDocs.length === 1 &&
            selectedReportsDocs[0];
          if (!doc) {
            return globalActions.setRightActionBar(model);
          }
          model.verified = doc.verified;
          model.type = doc.content_type;
          const verifyingReport = Selectors.getVerifyingReport(getState());
          model.verifyingReport = verifyingReport;
          if (!doc.contact || !doc.contact._id) {
            return globalActions.setRightActionBar(model);
          }

          getContact(doc.contact._id).then(contact => {
            model.sendTo = contact;
            globalActions.setRightActionBar(model);
          });
        });
      }

      function setSelected(model) {
        dispatch(function(dispatch, getState) {
          const selectMode = Selectors.getSelectMode(getState());
          const selectedReports = Selectors.getSelectedReports(getState());
          let refreshing = true;
          if (selectMode) {
            const existing = _.find(selectedReports, { _id: model.doc._id });
            if (existing) {
              Object.assign(existing, model);
            } else {
              model.expanded = false;
              addSelectedReport(model);
            }
          } else {
            if (LiveList.reports.initialised()) {
              LiveList.reports.setSelected(model.doc && model.doc._id);
              LiveList['report-search'].setSelected(model.doc && model.doc._id);
            }
            refreshing =
              model.doc &&
              selectedReports.length &&
              selectedReports[0]._id === model.doc._id;
            if (!refreshing) {
              setVerifyingReport(false);
            }

            model.expanded = true;
            setSelectedReports([model]);
            setTitle(model);

            const listModel = LiveList.reports.getList().find(item => item._id === model._id);
            if (listModel && !listModel.read) {
              const unreadCount = Selectors.getUnreadCount(getState());
              globalActions.updateUnreadCount({ report: unreadCount.report - 1 });
              listModel.read = true;
              LiveList.reports.update(listModel);
              LiveList['report-search'].update(listModel);
              MarkRead([model.doc]).catch(err => $log.error('Error marking read', err));
            }
          }
          setRightActionBar();
          globalActions.settingSelected(refreshing);
        });
      }

      const selectReport = (id, { silent=false }={}) => {
        if (!id) {
          return Promise.resolve();
        }
        if (!silent) {
          globalActions.setLoadingShowContent(id);
        }
        return ReportViewModelGenerator(id)
          .then(model => {
            if (model) {
              setSelected(model);
            }
          })
          .catch(err => {
            globalActions.unsetSelected();
            $log.error('Error selecting report', err);
          });
      };

      function deselectAll() {
        dispatch(() => {
          setSelectedReports([]);
          setRightActionBar();
          setCheckboxElements(false);
        });
      }

      function toggleVerifyingReport() {
        dispatch((dispatch, getState) => {
          const verifyingReport = Selectors.getVerifyingReport(getState());
          setVerifyingReport(!verifyingReport);
          setRightActionBar();
        });
      }

      function clearSelection() {
        setSelectedReports([]);
        setVerifyingReport(false);
        LiveList.reports.clearSelected();
        LiveList['report-search'].clearSelected();
        setCheckboxElements(false);
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

      function setSelect(value) {
        globalActions.setSelectMode(value);
        globalActions.unsetSelected();
        $state.go('reports.detail', { id: null });
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
