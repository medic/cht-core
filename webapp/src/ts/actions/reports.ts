import { Store, createAction } from '@ngrx/store';

import { createMultiValueAction, createSingleValueAction } from '@mm-actions/actionUtils';
import { GlobalActions } from '@mm-actions/global';

export const Actions = {
  selectReport: createMultiValueAction('SELECT_REPORT'),
  setSelected: createMultiValueAction('SET_SELECTED_REPORT'),
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
  setSelectMode: createAction('SET_REPORTS_SELECT_MODE'),
  selectAll: createAction('SELECT_ALL_REPORTS'),
};

export class ReportsActions {
  constructor(private store: Store) {}

  addSelectedReport(selected) {
    return this.store.dispatch(Actions.addSelectedReport(selected));
  }

  selectReport(id, { silent=false, forceSingleSelect=false }={}) {
    return this.store.dispatch(Actions.selectReport({ id, silent, forceSingleSelect }));
  }

  removeSelectedReport(id) {
    this.store.dispatch(Actions.removeSelectedReport(id));
    const globalActions = new GlobalActions(this.store);
    globalActions.settingSelected();
    this.setRightActionBar();
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

  setSelected(selected, { forceSingleSelect=false }={}) {
    return this.store.dispatch(Actions.setSelected({ selected, forceSingleSelect }));
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
    this.store.dispatch(Actions.setSelectedReport(undefined));
    this.store.dispatch(Actions.setSelectedReports([]));
  }

  setSelectMode() {
    return this.store.dispatch(Actions.setSelectMode());
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
