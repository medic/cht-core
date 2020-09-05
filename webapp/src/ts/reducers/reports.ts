import { Actions } from '../actions/reports';
import { createReducer, on } from '@ngrx/store';
import * as _ from 'lodash-es';

const initialState = {
  reports: [],
  reportsById: new Set(),
  selected: [],
  verifyingReport: false,
  filters: {},
};


const _removeReport = (reports, reportsById, report) => {
  if (!report._id || !reportsById.has(report._id)) {
    return;
  }

  const idx = reports.findIndex(r => r._id === report._id);
  reports.splice(idx, 1);
  reportsById.delete(report._id);
}

const _insertReport = (reports, reportsById, report) => {
  if (!report._id || reportsById.has(report._id)) {
    return;
  }

  const idx = _.sortedIndexBy(reports, report, r => -r.reported_date);
  reports.splice(idx, 0, report);
  reportsById.add(report._id);
}

const updateReports = (state, newReports) => {
  const reports = [...state.reports];
  const reportsById = new Set(state.reportsById);

  newReports.forEach(report => {
    _removeReport(reports, reportsById, report);
    _insertReport(reports, reportsById, report);
  });

  return { ...state, reports, reportsById };
}

const removeReport = (state, report) => {
  const reports = [ ...state.reports];
  const reportsById = new Set(state.reportsById);

  _removeReport(reports, reportsById, report);
  return { ...state, reports, reportsById };
}

const _reportsReducer = createReducer(
  initialState,
  on(Actions.updateReportsList, (state, { payload: { reports } }) => updateReports(state, reports)),
  on(Actions.removeReportFromList, (state, { payload: { report } }) => removeReport(state, report)),
  on(Actions.resetReportsList, (state) => ({ ...state, reports: [], reportsById: new Map })),
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
  case actionTypes.ADD_SELECTED_REPORT:
    return Object.assign({}, state, {
      selected: state.selected.concat(action.payload.selected)
    });
  case actionTypes.CLEAR_SELECTED:
    return Object.assign({}, state, { selected: [], verifyingReport: false });
  case actionTypes.REMOVE_SELECTED_REPORT: {
    const filteredSelected = _.filter(state.selected, selected => selected._id !== action.payload.id);
    return Object.assign({}, state, { selected: filteredSelected });
  }
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
  case actionTypes.SET_SELECTED_REPORTS:
    return Object.assign({}, state, { selected: action.payload.selected });
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
