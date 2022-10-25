import { Store, createAction } from '@ngrx/store';

import { createMultiValueAction, createSingleValueAction } from '@mm-actions/actionUtils';
import { GlobalActions } from '@mm-actions/global';

export const Actions = {
  openReportContent: createSingleValueAction('OPEN_REPORT_CONTENT', 'report'),
  selectReportToOpen: createMultiValueAction('SELECT_REPORT_TO_OPEN'),
  selectReport: createSingleValueAction('SELECT_REPORT', 'reportId'),
  addSelectedReport: createSingleValueAction('ADD_SELECTED_REPORT', 'report'),
  removeSelectedReport: createSingleValueAction('REMOVE_SELECTED_REPORT', 'report'),
  setSelectedReport: createSingleValueAction('SET_SELECTED_REPORT', 'selectedReport'),
  setSelectedReports: createSingleValueAction('SET_SELECTED_REPORTS', 'selectedReports'),
  setVerifyingReport: createSingleValueAction('SET_VERIFYING_REPORT', 'verifyingReport'),
  toggleVerifyingReport: createAction('TOGGLE_VERIFYING_REPORT'),
  verifyReport: createSingleValueAction('VERIFY_REPORT', 'verified'),
  updateSelectedReportsItem: createMultiValueAction('UPDATE_SELECTED_REPORTS_ITEM'),
  markReportRead: createSingleValueAction('MARK_REPORT_READ', 'id'),
  launchEditFacilityDialog: createAction('LAUNCH_EDIT_FACILITY_DIALOG'),
  setSelectedReportDocProperty: createSingleValueAction('SET_SELECTED_REPORT_DOC_PROPERTY', 'doc'),
  setSelectedReportFormattedProperty: createSingleValueAction('SET_SELECTED_REPORT_FORMATTED_PROPERTY', 'formatted'),

  updateReportsList: createSingleValueAction('UPDATE_REPORTS_LIST', 'reports'),
  removeReportFromList: createSingleValueAction('REMOVE_REPORT_FROM_LIST', 'report'),
  resetReportsList: createAction('RESET_REPORTS_LIST'),

  setRightActionBar: createAction('SET_RIGHT_ACTION_BAR_REPORTS'),
  setTitle: createSingleValueAction('SET_REPORTS_TITLE', 'selected'),
  selectAll: createAction('SELECT_ALL_REPORTS'),
};

export class ReportsActions {
  constructor(private store: Store) {}

  openReportContent(report) {
    return this.store.dispatch(Actions.openReportContent(report));
  }

  addSelectedReport(selected) {
    return this.store.dispatch(Actions.addSelectedReport(selected));
  }

  selectReport(reportId) {
    return this.store.dispatch(Actions.selectReport(reportId));
  }

  selectReportToOpen(reportId, { silent = false }={}) {
    return this.store.dispatch(Actions.selectReportToOpen({ reportId, silent }));
  }

  removeSelectedReport(id) {
    this.store.dispatch(Actions.removeSelectedReport(id));
  }

  setSelectedReport(selected?) {
    return this.store.dispatch(Actions.setSelectedReport(selected));
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
    this.setSelectedReport();
    this.setSelectedReports([]);
  }

  updateSelectedReportsItem(id, selected) {
    return this.store.dispatch(Actions.updateSelectedReportsItem({ id, selected }));
  }

  deselectAll() {
    this.store.dispatch(Actions.setSelectedReports([]));
    this.setRightActionBar();
  }

  selectAll() {
    const globalActions = new GlobalActions(this.store);
    globalActions.setLoadingContent(true);
    this.store.dispatch(Actions.selectAll());
  }

  launchEditFacilityDialog() {
    this.store.dispatch(Actions.launchEditFacilityDialog());
  }

  toggleVerifyingReport() {
    this.store.dispatch(Actions.toggleVerifyingReport());
    this.setRightActionBar();
  }

  verifyReport(verified) {
    return this.store.dispatch(Actions.verifyReport(verified));
  }

  setSelectedReportDocProperty(doc) {
    return this.store.dispatch(Actions.setSelectedReportDocProperty(doc));
  }

  setSelectedReportFormattedProperty(formatted) {
    return this.store.dispatch(Actions.setSelectedReportFormattedProperty(formatted));
  }
}
