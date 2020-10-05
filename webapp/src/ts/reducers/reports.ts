import { Actions } from '../actions/reports';
import { createReducer, on } from '@ngrx/store';
import { UniqueSortedList } from './utils';
import * as _ from 'lodash-es';

const initialState = {
  reports: [],
  reportsById: new Set(),
  selected: [],
  verifyingReport: false,
  filters: {},
};

const updateReports = (state, newReports) => {
  const reports = [...state.reports];
  const reportsById = new Set(state.reportsById);

  const list = new UniqueSortedList(reports, reportsById, 'reported_date');
  newReports.forEach(report => {
    list.remove(report);
    list.add(report);
  });

  return { ...state, reports, reportsById };
}

const removeReport = (state, report) => {
  const reports = [ ...state.reports];
  const reportsById = new Set(state.reportsById);

  const list = new UniqueSortedList(reports, reportsById, 'reported_date');
  list.remove(report);

  return { ...state, reports, reportsById };
}

const _reportsReducer = createReducer(
  initialState,
  on(Actions.updateReportsList, (state, { payload: { reports } }) => updateReports(state, reports)),
  on(Actions.removeReportFromList, (state, { payload: { report } }) => removeReport(state, report)),
  on(Actions.resetReportsList, (state) => ({ ...state, reports: [], reportsById: new Map })),

  on(Actions.addSelectedReport, (state, { payload: { report } }) => {
    return {
      ...state,
      selected: [...state.selected, report],
    };
  }),

  on(Actions.removeSelectedReport, (state, { payload: { report } }) => {
    return {
      ...state,
      selected: state.selected.filter(selectedReport => selectedReport._id !== report._id),
    }
  }),

  on(Actions.setSelectedReports, (state, { payload: { selected } }) => ({ ...state, selected })),


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
  case actionTypes.CLEAR_SELECTED:
    return Object.assign({}, state, { selected: [], verifyingReport: false });
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
    const selected = state.selected.map(item => {
      if (item._id === action.payload.id) {
        return Object.assign({}, item, action.payload.selected);
      }
      return item;
    });
    return Object.assign({}, state, { selected });
  }
  default:
    return state;
  }
};
*/
