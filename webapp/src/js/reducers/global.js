const actionTypes = require('../actions/actionTypes');
const initialState = {
  cancelCallback: null,
  enketoStatus: {
    edited: false,
    saving: false,
    error: null
  },
  facilities: [],
  isAdmin: false,
  lastChangedDoc: false,
  loadingContent: false,
  loadingSubActionBar: false,
  selectMode: false,
  showActionBar: false,
  showContent: false,
  version: null
};

module.exports = function(state, action) {
  if (typeof state === 'undefined') {
    state = initialState;
  }

  switch (action.type) {
    case actionTypes.SET_CANCEL_CALLBACK:
      return Object.assign({}, state, { cancelCallback: action.payload.cancelCallback });
    case actionTypes.SET_ENKETO_STATUS:
      return Object.assign({}, state, {
        enketoStatus: Object.assign({}, state.enketoStatus, action.payload.enketoStatus)
      });
    case actionTypes.SET_FACILITIES:
      return Object.assign({}, state, { facilities: action.payload.facilities });
    case actionTypes.SET_IS_ADMIN:
      return Object.assign({}, state, { isAdmin: action.payload.isAdmin });
    case actionTypes.SET_LAST_CHANGED_DOC:
      return Object.assign({}, state, { lastChangedDoc: action.payload.lastChangedDoc });
    case actionTypes.SET_LOADING_CONTENT:
      return Object.assign({}, state, { loadingContent: action.payload.loadingContent });
    case actionTypes.SET_LOADING_SUB_ACTION_BAR:
      return Object.assign({}, state, { loadingSubActionBar: action.payload.loadingSubActionBar });
    case actionTypes.SET_SELECT_MODE:
      return Object.assign({}, state, { selectMode: action.payload.selectMode });
    case actionTypes.SET_SHOW_ACTION_BAR:
      return Object.assign({}, state, { showActionBar: action.payload.showActionBar });
    case actionTypes.SET_SHOW_CONTENT:
      return Object.assign({}, state, { showContent: action.payload.showContent });
    case actionTypes.SET_VERSION:
      return Object.assign({}, state, { version: action.payload.version });
    default:
      return state;
  }
};
