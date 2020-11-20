import { createReducer, on } from '@ngrx/store';

import { Actions } from '@mm-actions/reports';
import { Actions as GlobalActions } from '@mm-actions/global';
import { UniqueSortedList } from './utils';

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
      selected: state.selected.map(item => {
        if (item._id === payload.id) {
          return { ...item, ...payload.selected };
        }
        return item;
      }),
    };
  }),
);

export function reportsReducer(state, action) {
  return _reportsReducer(state, action);
}

/*
const _ = require('lodash/core');
const actionTypes = require('../actions/actionTypes');


module.exports = function(state, action) {
  if (typeof state === 'undefined') {
    state = initialState;
  }


  switch (action.type) {
  case actionTypes.SET_FIRST_SELECTED_REPORT_DOC_PROPERTY: {
    const selected = state.selected.map((item, index) => {
      if (index === 0) {
        return Object.assign({}, item, {
          doc: Object.assign({}, item.doc, action.payload.doc)
        });
      }
      return item;
    });
    return Object.assign({}, state, { selected });
  }
  case actionTypes.SET_FIRST_SELECTED_REPORT_FORMATTED_PROPERTY: {
    const selected = state.selected.map((item, index) => {
      if (index === 0) {
        return Object.assign({}, item, {
          formatted: Object.assign({}, item.formatted, action.payload.formatted)
        });
      }
      return item;
    });
    return Object.assign({}, state, { selected });
  }
  case actionTypes.SET_VERIFYING_REPORT:
    return Object.assign({}, state, { verifyingReport: action.payload.verifyingReport });
  case actionTypes.UPDATE_SELECTED_REPORT_ITEM: {

  default:
    return state;
  }
};
*/
