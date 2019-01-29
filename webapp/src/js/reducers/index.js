(function() {
  var initialState = {
    cancelCallback: null,
    enketoStatus: {
      edited: false,
      saving: false,
      error: null
    },
    loadingContent: false,
    selected: null,
    showActionBar: false,
    showContent: false,
    title: '' // TODO initial setTitle value null?
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
      case 'SET_LOADING_CONTENT':
        return Object.assign({}, state, { loadingContent: action.payload.loadingContent });
      case 'SET_SHOW_ACTION_BAR':
        return Object.assign({}, state, { showActionBar: action.payload.showActionBar });
      case 'SET_SHOW_CONTENT':
        return Object.assign({}, state, { showContent: action.payload.showContent });
      case 'SET_TITLE':
        return Object.assign({}, state, { title: action.payload.title });
      default:
        return state;
    }
  };
}());
