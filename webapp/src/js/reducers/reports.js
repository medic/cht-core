const actionTypes = require('../actions/actionTypes');
const initialState = {
  errorSyntax: false
};

module.exports = function(state, action) {
  if (typeof state === 'undefined') {
    state = initialState;
  }

  switch (action.type) {
    case actionTypes.SET_REPORTS_ERROR_SYNTAX:
      return Object.assign({}, state, { errorSyntax: action.payload.errorSyntax });
    default:
      return state;
  }
};
