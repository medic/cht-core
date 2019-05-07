const actionTypes = require('../actions/actionTypes');
const initialState = {
  loadingSummary: false
};

module.exports = function(state, action) {
  if (typeof state === 'undefined') {
    state = initialState;
  }

  switch (action.type) {
    case actionTypes.SET_LOADING_SUMMARY:
      return Object.assign({}, state, { loadingSummary: action.payload.loadingSummary });
    default:
      return state;
  }
};
