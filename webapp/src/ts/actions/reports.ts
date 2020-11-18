import { Store, createAction } from '@ngrx/store';
import { take } from 'rxjs/operators';

import { createMultiValueAction, createSingleValueAction } from './actionUtils';
import { GlobalActions } from '@mm-actions/global';
import { Selectors } from '@mm-selectors/index';

export const Actions = {
  selectReport: createMultiValueAction('SELECT_REPORT'),
  setSelected: createSingleValueAction('SET_SELECTED_REPORT', 'selected'),
  addSelectedReport: createSingleValueAction('ADD_SELECTED_REPORT', 'report'),
  removeSelectedReport: createSingleValueAction('REMOVE_SELECTED_REPORT', 'report'),
  setSelectedReports: createSingleValueAction('SET_SELECTED_REPORTS', 'selected'),
  setVerifyingReport: createSingleValueAction('SET_VERIFYING_REPORT', 'verifyingReport'),
  verifyReport: createSingleValueAction('VERIFY_REPORT', 'verified'),
  updateSelectedReportItem: createMultiValueAction('UPDATE_SELECTED_REPORT_ITEM'),
  markReportRead: createSingleValueAction('MARK_REPORT_READ', 'id'),
  launchEditFacilityDialog: createAction('LAUNCH_EDIT_FACILITY_DIALOG'),
  setFirstSelectedReportDocProperty: createSingleValueAction('SET_FIRST_SELECTED_REPORT_DOC_PROPERTY', 'doc'),
  setFirstSelectedReportFormattedProperty: createSingleValueAction(
    'SET_FIRST_SELECTED_REPORT_FORMATTED_PROPERTY',
    'formatted'
  ),

  updateReportsList: createSingleValueAction('UPDATE_REPORTS_LIST', 'reports'),
  removeReportFromList: createSingleValueAction('REMOVE_REPORT_FROM_LIST', 'report'),
  resetReportsList: createAction('RESET_REPORTS_LIST'),

  setRightActionBar: createAction('SET_RIGHT_ACTION_BAR_REPORTS'),
  setTitle: createSingleValueAction('SET_REPORTS_TITLE', 'selected'),
  setSelectMode: createSingleValueAction('SET_REPORTS_SELECT_MODE', 'selectMode'),
  selectAll: createAction('SELECT_ALL_REPORTS'),
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
    return this.store
      .select(Selectors.getVerifyingReport)
      .pipe(take(1))
      .subscribe(verifyingReport => {
        this.store.dispatch(Actions.setVerifyingReport(!verifyingReport));
        this.setRightActionBar();
      });
  }

  verifyReport(verified) {
    return this.store.dispatch(Actions.verifyReport(verified));
  }

  setFirstSelectedReportDocProperty(doc) {
    return this.store.dispatch(Actions.setFirstSelectedReportDocProperty(doc));
  }

  setFirstSelectedReportFormattedProperty(formatted) {
    return this.store.dispatch(Actions.setFirstSelectedReportFormattedProperty(formatted));
  }
}
