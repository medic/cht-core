const merge = require('lodash/merge');
const actionTypes = require('../actions/actionTypes');
const initialState = {
  loadingSelectedChildren: false,
  loadingSelectedReports: false,
  loadingSummary: false,
  selected: null
};

module.exports = function(state, action) {
  if (typeof state === 'undefined') {
    state = initialState;
  }

  switch (action.type) {
  case actionTypes.CLEAR_SELECTED:
    return Object.assign({}, state, { selected: null });
  case actionTypes.RECEIVE_SELECTED_CONTACT_CHILDREN:
    return Object.assign({}, state, {
      selected: Object.assign({}, state.selected, { children: action.payload.children }),
      loadingSelectedChildren: false
    });
  case actionTypes.RECEIVE_SELECTED_CONTACT_REPORTS:
    return Object.assign({}, state, {
      selected: Object.assign({}, state.selected, { reports: action.payload.reports }),
      loadingSelectedReports: false
    });
  case actionTypes.RECEIVE_SELECTED_CONTACT_TARGETS:
    return Object.assign({}, state, {
      selected: Object.assign({}, state.selected, { targets: action.payload.targets }),
    });
  case actionTypes.SET_LOADING_SELECTED_CONTACT:
    return Object.assign({}, state, {
      loadingSelectedChildren: true,
      loadingSelectedReports: true,
    });
  case actionTypes.SET_CONTACTS_LOADING_SUMMARY:
    return Object.assign({}, state, { loadingSummary: action.payload.loadingSummary });
  case actionTypes.SET_SELECTED_CONTACT:
    return Object.assign({}, state, { selected: action.payload.selected });
  case actionTypes.UPDATE_SELECTED_CONTACT:
    return Object.assign({}, state, {
      selected: merge({}, state.selected, action.payload.selected)
    });
  default:
    return state;
  }
};
