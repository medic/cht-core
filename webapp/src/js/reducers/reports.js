const _ = require('lodash/core');
const actionTypes = require('../actions/actionTypes');
const initialState = {
  selected: [],
  verifyingReport: false
};

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
