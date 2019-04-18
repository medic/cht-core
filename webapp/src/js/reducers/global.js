const actionTypes = require('../actions/actionTypes');
const initialState = {
  actionBar: {
    left: {},
    right: {}
  },
  cancelCallback: null,
  enketoStatus: {
    edited: false,
    saving: false,
    error: null
  },
  facilities: [],
  isAdmin: false,
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
    case actionTypes.SET_ACTION_BAR_LEFT:
      return Object.assign({}, state, {
        actionBar: Object.assign({}, state.actionBar, {
          left: Object.assign({}, state.actionBar.left, action.payload.left)
        })
      });
    case actionTypes.SET_ACTION_BAR_RIGHT:
      return Object.assign({}, state, {
        actionBar: Object.assign({}, state.actionBar, {
          right: Object.assign({}, state.actionBar.right, action.payload.right)
        })
      });
    case actionTypes.SET_ACTION_BAR_RIGHT_VERIFIED:
      return Object.assign({}, state, {
        actionBar: Object.assign({}, state.actionBar, {
          right: Object.assign({}, state.actionBar.right, { verified: action.payload.verified })
        })
      });
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
