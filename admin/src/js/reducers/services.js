const actionTypes = require('../actions/actionTypes');
const initialState = {
  lastChangedDoc: false
};

module.exports = function(state, action) {
  if (typeof state === 'undefined') {
    state = initialState;
  }

  switch (action.type) {
  case actionTypes.SET_LAST_CHANGED_DOC:
    return Object.assign({}, state, { lastChangedDoc: action.payload.lastChangedDoc });
  default:
    return state;
  }
};
