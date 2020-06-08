const _ = require('lodash/core');
const actionTypes = require('../actions/actionTypes');
const initialState = {
  selected: []
};

module.exports = function(state, action) {
  if (typeof state === 'undefined') {
    state = initialState;
  }

  switch (action.type) {
  case actionTypes.ADD_SELECTED_TRAINING:
    return Object.assign({}, state, {
      selected: state.selected.concat(action.payload.selected)
    });
  case actionTypes.CLEAR_SELECTED:
    return Object.assign({}, state, { selected: [] });
  case actionTypes.REMOVE_SELECTED_TRAINING: {
    const filteredSelected = _.filter(state.selected, selected => selected._id !== action.payload.id);
    return Object.assign({}, state, { selected: filteredSelected });
  }
  case actionTypes.SET_FIRST_SELECTED_TRAINING_DOC_PROPERTY: {
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
  case actionTypes.SET_FIRST_SELECTED_TRAINING_FORMATTED_PROPERTY: {
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
  case actionTypes.SET_SELECTED_TRAININGS:
    return Object.assign({}, state, { selected: action.payload.selected });
  case actionTypes.UPDATE_SELECTED_TRAINING_ITEM: {
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
