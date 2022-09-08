import { createReducer, on } from '@ngrx/store';

import { Actions } from '@mm-actions/reports';
import { Actions as GlobalActions } from '@mm-actions/global';
import { UniqueSortedList } from '@mm-reducers/utils';

const initialState = {
  reports: [],
  reportsById: new Map(),
  selected: [],
  verifyingReport: false,
  filters: {},
};

const isSelected = (state, report) => {
  return !!state.selected?.find(selectedReport => selectedReport._id === report._id);
};

const setSelected = (state, report) => ({
  ...report,
  selected: isSelected(state, report),
});

const updateReports = (state, newReports) => {
  const reports = [...state.reports];
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
  const reports = [ ...state.reports];
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
      selected: [...state.selected, report],
    };
  }),

  on(Actions.removeSelectedReport, (state, { payload: { report } }) => {
    const reportId = report?._id || report;
    return {
      ...state,
      selected: state.selected.filter(selectedReport => selectedReport._id !== reportId),
    };
  }),

  on(Actions.setSelectedReports, (state, { payload: { selected } }) => ({ ...state, selected })),

  on(GlobalActions.clearSelected, (state) => ({ ...state, selected: [], verifyingReport: false })),

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

  on(Actions.updateSelectedReportItem, (state, { payload }) => {
    return {
      ...state,
      selected: state.selected?.map(item => {
        if (item._id === payload.id) {
          return { ...item, ...payload.selected };
        }
        return item;
      }),
    };
  }),

  on(Actions.setVerifyingReport, (state, { payload: { verifyingReport } }) => ({ ...state, verifyingReport })),
  on(Actions.toggleVerifyingReport, (state) => ({ ...state, verifyingReport: !state.verifyingReport })),

  on(Actions.setFirstSelectedReportDocProperty, (state, { payload: { doc } }) => {
    return {
      ...state,
      selected: state.selected?.map((item, idx) => {
        if (idx === 0) {
          return { ...item, doc: { ...item?.doc, ...doc } };
        }

        return item;
      })
    };
  }),

  on(Actions.setFirstSelectedReportFormattedProperty, (state, { payload: { formatted }}) => {
    return {
      ...state,
      selected: state.selected?.map((item, idx) => {
        if (idx === 0) {
          return { ...item, formatted: { ...item.formatted, ...formatted } };
        }
        return item;
      }),
    };
  }),
);

export const reportsReducer = (state, action) => {
  return _reportsReducer(state, action);
};
