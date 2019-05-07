const actionTypes = require('../actions/actionTypes');
const initialState = {
  error: false
};

module.exports = function(state, action) {
  if (typeof state === 'undefined') {
    state = initialState;
  }

  switch (action.type) {
    case actionTypes.SET_MESSAGES_ERROR:
      return Object.assign({}, state, { error: action.payload.error });
    default:
      return state;
  }
};
