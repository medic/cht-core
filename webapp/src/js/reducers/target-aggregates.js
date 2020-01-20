const actionTypes = require('../actions/actionTypes');
const initialState = {
  selected: null,
  targetAggregates: [],
  supervisees: [],
};

module.exports = function(state, action) {
  if (typeof state === 'undefined') {
    state = initialState;
  }

  switch (action.type) {
  case actionTypes.CLEAR_SELECTED: //todo
    return Object.assign({}, state, { selected: null });
  case actionTypes.SET_SELECTED_TARGET:
    return Object.assign({}, state, { selected: action.payload.selected });
  case actionTypes.SET_TARGET_AGGREGATES:
    return Object.assign({}, state, { targetAggregates: action.payload.targetAggregates });
  default:
    return state;
  }
};
