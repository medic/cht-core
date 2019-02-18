(function() {
  var initialState = {
    cancelCallback: null,
    enketoStatus: {
      edited: false,
      saving: false,
      error: null
    },
    selectMode: false
  };

  module.exports = function(state, action) {
    if (typeof state === 'object' && Object.keys(state).length === 0) {
      state = initialState;
    }

    switch (action.type) {
      case 'SET_CANCEL_CALLBACK':
        return Object.assign({}, state, { cancelCallback: action.payload.cancelCallback });
      case 'SET_ENKETO_STATUS':
        return Object.assign({}, state, {
          enketoStatus: Object.assign({}, state.enketoStatus, action.payload.enketoStatus)
        });
      case 'SET_SELECT_MODE':
        return Object.assign({}, state, { selectMode: action.payload.selectMode });
      default:
        return state;
    }
  };
}());
