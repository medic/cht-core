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
      case 'SET_ENKETO_ERROR':
        return Object.assign({}, state, {
          enketoStatus: Object.assign({}, state.enketoStatus, { error: action.payload.error })
        });
      case 'SET_ENKETO_EDITED_STATUS':
        return Object.assign({}, state, {
          enketoStatus: Object.assign({}, state.enketoStatus, { edited: action.payload.edited })
        });
      case 'SET_ENKETO_SAVING_STATUS':
        return Object.assign({}, state, {
          enketoStatus: Object.assign({}, state.enketoStatus, { saving: action.payload.saving })
        });
      case 'SET_SELECT_MODE':
        return Object.assign({}, state, { selectMode: action.payload.selectMode });
      default:
        return state;
    }
  };
}());
