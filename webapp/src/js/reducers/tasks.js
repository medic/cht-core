const actionTypes = require('../actions/actionTypes');
const initialState = {
  selected: null
};

module.exports = function(state, action) {
  if (typeof state === 'undefined') {
    state = initialState;
  }

  switch (action.type) {
  case actionTypes.CLEAR_SELECTED:
    return Object.assign({}, state, { selected: null });
  case actionTypes.SET_SELECTED_TASK:
    return Object.assign({}, state, { selected: action.payload.selected });
  case actionTypes.SET_TASKS_LOADED:
    return Object.assign({}, state, { loaded: action.payload.loaded });
  default:
    return state;
  }
};
