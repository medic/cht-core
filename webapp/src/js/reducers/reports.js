const actionTypes = require('../actions/actionTypes');
const initialState = {
};

module.exports = function(state, action) {
  if (typeof state === 'undefined') {
    state = initialState;
  }

  switch (action.type) {
    default:
      return state;
  }
};
