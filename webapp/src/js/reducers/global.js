const actionTypes = require('../actions/actionTypes');
const initialState = {
  actionBar: {
    left: {},
    right: {}
  },
  cancelCallback: null,
  currentTab: null,
  enketoStatus: {
    edited: false,
    saving: false,
    error: null
  },
  facilities: [],
  filters: {},
  forms: null,
  isAdmin: false,
  lastChangedDoc: false,
  loadingContent: false,
  loadingSubActionBar: false,
  replicationStatus: {},
  selectMode: false,
  showActionBar: false,
  showContent: false,
  title: null,
  unreadCount: {},
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
  case actionTypes.SET_ANDROID_APP_VERSION:
    return Object.assign({}, state, { androidAppVersion: action.payload.androidAppVersion });
  case actionTypes.SET_CANCEL_CALLBACK:
    return Object.assign({}, state, { cancelCallback: action.payload.cancelCallback });
  case actionTypes.SET_CURRENT_TAB:
    return Object.assign({}, state, { currentTab: action.payload.currentTab });
  case actionTypes.SET_ENKETO_STATUS:
    return Object.assign({}, state, {
      enketoStatus: Object.assign({}, state.enketoStatus, action.payload.enketoStatus)
    });
  case actionTypes.SET_FILTER:
    return Object.assign({}, state, {
      filters: Object.assign({}, state.filters, action.payload.filter)
    });
  case actionTypes.SET_FILTERS:
    return Object.assign({}, state, { filters: action.payload.filters });
  case actionTypes.SET_FORMS:
    return Object.assign({}, state, { forms: action.payload.forms });
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
  case actionTypes.SET_TITLE:
    return Object.assign({}, state, { title: action.payload.title });
  case actionTypes.SET_UNREAD_COUNT:
    return Object.assign({}, state, { unreadCount: action.payload.unreadCount });
  case actionTypes.UPDATE_UNREAD_COUNT:
    return Object.assign({}, state, {
      unreadCount: Object.assign({}, state.unreadCount, action.payload.unreadCount)
    });
  case actionTypes.SET_VERSION:
    return Object.assign({}, state, { version: action.payload.version });
  case actionTypes.UPDATE_REPLICATION_STATUS:
    return Object.assign({}, state, {
      replicationStatus: Object.assign({}, state.replicationStatus, action.payload.replicationStatus)
    });
  default:
    return state;
  }
};
