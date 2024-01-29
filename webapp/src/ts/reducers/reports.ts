import { createReducer, on } from '@ngrx/store';

import { Actions } from '@mm-actions/reports';
import { Actions as GlobalActions } from '@mm-actions/global';
import { UniqueSortedList } from '@mm-reducers/utils';

const initialState = {
  reports: [] as any[],
  reportsById: new Map(),
  selectedReport: undefined as any,
  selectedReports: [] as any[],
  verifyingReport: false,
  filters: {},
};

const isSelected = (state, report) => {
  return !!state.selectedReports?.find(selectedReport => selectedReport._id === report._id);
};

const setSelected = (state, report) => ({
  ...report,
  selected: isSelected(state, report),
});

const updateReports = (state, newReports) => {
  const reports = [ ...state.reports ];
  const reportsById = new Map(state.reportsById);

  const list = new UniqueSortedList(reports, reportsById, 'reported_date');
  newReports.forEach(report => {
    report = setSelected(state, report);
    list.remove(report);
    list.add(report);
  });

  return { ...state, reports, reportsById };
};

const removeReport = (state, report) => {
  const reports = [ ...state.reports ];
  const reportsById = new Map(state.reportsById);

  const list = new UniqueSortedList(reports, reportsById, 'reported_date');
  list.remove(report);

  return { ...state, reports, reportsById };
};

const _reportsReducer = createReducer(
  initialState,
  on(Actions.updateReportsList, (state, { payload: { reports } }) => updateReports(state, reports)),
  on(Actions.removeReportFromList, (state, { payload: { report } }) => removeReport(state, report)),
  on(Actions.resetReportsList, (state) => ({ ...state, reports: [], reportsById: new Map() })),

  on(Actions.addSelectedReport, (state, { payload: { report } }) => {
    return {
      ...state,
      selectedReports: [ ...state.selectedReports, report ],
    };
  }),

  on(Actions.removeSelectedReport, (state, { payload: { report } }) => {
    const reportId = report?._id || report;
    return {
      ...state,
      selectedReports: state.selectedReports.filter(selectedReport => selectedReport._id !== reportId),
    };
  }),

  on(Actions.setSelectedReport, (state, { payload: { selectedReport } }) => ({ ...state, selectedReport })),

  on(Actions.setSelectedReports, (state, { payload: { selectedReports } }) => ({ ...state, selectedReports })),

  on(GlobalActions.clearSelected, (state) => ({
    ...state,
    selectedReports: [],
    selectedReport: undefined,
    verifyingReport: false,
  })),

  on(
    Actions.addSelectedReport,
    Actions.removeSelectedReport,
    Actions.setSelectedReports,
    GlobalActions.clearSelected,
    (state) => {
      const reportsById = new Map(state.reportsById);
      const reports = state.reports.map(report => {
        report = setSelected(state, report);
        reportsById.set(report._id, report);
        return report;
      });

      return { ...state, reports, reportsById };
    }
  ),

  on(Actions.updateSelectedReportsItem, (state, { payload }) => {
    let selectedReport = state.selectedReport;
    if (selectedReport?._id === payload.id) {
      selectedReport = { ...selectedReport, ...payload.selected };
    }

    const selectedReports = state.selectedReports?.map(item => {
      return item._id === payload.id ? { ...item, ...payload.selected } : item;
    });

    return { ...state, selectedReport, selectedReports };
  }),

  on(Actions.setVerifyingReport, (state, { payload: { verifyingReport } }) => ({ ...state, verifyingReport })),
  on(Actions.toggleVerifyingReport, (state) => ({ ...state, verifyingReport: !state.verifyingReport })),

  on(Actions.setSelectedReportDocProperty, (state, { payload }) => {
    if (!state.selectedReport || state.selectedReport._id !== payload.id) {
      return state;
    }

    const selectedReport = {
      ...state.selectedReport,
      doc: { ...state.selectedReport?.doc, ...payload.doc },
    };
    const selectedReports = state.selectedReports?.map(item => {
      return item._id === selectedReport._id ? { ...item, ...selectedReport } : item;
    });

    return { ...state, selectedReport, selectedReports };
  }),

  on(Actions.setSelectedReportFormattedProperty, (state, { payload }) => {
    if (!state.selectedReport || state.selectedReport._id !== payload.id) {
      return state;
    }

    const selectedReport = {
      ...state.selectedReport,
      formatted: { ...state.selectedReport?.formatted, ...payload.formatted },
    };
    const selectedReports = state.selectedReports?.map(item => {
      return item._id === selectedReport._id ? { ...item, ...selectedReport } : item;
    });

    return { ...state, selectedReport, selectedReports };
  }),
);

export const reportsReducer = (state, action) => {
  return _reportsReducer(state, action);
};
