import { createReducer, on } from '@ngrx/store';

import { Actions } from '@mm-actions/global';

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
  minimalTabs: false,
  replicationStatus: {},
  selectMode: false,
  privacyPolicyAccepted: false,
  showActionBar: false,
  showContent: false,
  showPrivacyPolicy: false,
  title: null,
  unreadCount: {},
  version: null,
  snackbarContent: null,
};


const _globalReducer = createReducer(
  initialState,
  on(Actions.updateReplicationStatus, (state, { payload: { replicationStatus } }) => {
    return Object.assign({}, state, {
      replicationStatus: Object.assign({}, state.replicationStatus, replicationStatus)
    });
  }),
  on(Actions.setAndroidAppVersion, (state, { payload: { androidAppVersion } }) => {
    return { ...state, androidAppVersion };
  }),
  on(Actions.setMinimalTabs, (state, { payload: { minimalTabs } } ) => {
    return { ...state, minimalTabs };
  }),
  on(Actions.setCurrentTab, (state, { payload: { currentTab } }) => {
    return { ...state, currentTab };
  }),
  on(Actions.setSnackbarContent, (state, { payload: { content } }) => {
    return { ...state, snackbarContent: content };
  }),
  on(Actions.setLoadingContent, (state, { payload: { loadingContent } }) => {
    return { ...state, loadingContent };
  }),
  on(Actions.setShowActionBar, (state, { payload: { showActionBar } }) => {
    return { ...state, showActionBar };
  }),
  on(Actions.setForms, (state, { payload: { forms } }) => {
    return { ...state, forms };
  }),
  on(Actions.clearFilters, (state) => {
    return { ...state, filters: {} };
  }),
  on(Actions.setFilters, (state, { payload: { filters } }) => {
    return { ...state, filters };
  }),
  on(Actions.setFilter, (state, { payload: { filter } }) => {
    return {
      ...state,
      filters: { ...state.filters, ...filter }
    };
  }),
  on(Actions.setIsAdmin, (state, { payload: { isAdmin } }) => {
    return { ...state, isAdmin };
  }),
  on(Actions.setTitle, (state, { payload: { title} }) => {
    return { ...state, title };
  }),
  on(Actions.setShowContent, (state, { payload: { showContent } }) => {
    return { ...state, showContent };
  }),
  on(Actions.setSelectMode, (state, { payload: { selectMode } }) => {
    return { ...state, selectMode };
  }),
  on(Actions.setLeftActionBar, (state, { payload: { left } }) => {
    return {
      ...state,
      actionBar: { ...state.actionBar, left }
    };
  }),
  on(Actions.setEnketoStatus, (state, { payload: { enketoStatus } }) => {
    return {
      ...state,
      enketoStatus: { ...state.enketoStatus, enketoStatus, },
    };
  }),
  on(Actions.setPrivacyPolicyAccepted, (state, { payload: { accepted } }) => {
    return { ...state, privacyPolicyAccepted: accepted };
  }),
  on(Actions.setShowPrivacyPolicy, (state, { payload: { show } }) => {
    return { ...state, showPrivacyPolicy: show };
  }),
);

export const globalReducer = (state, action) => {
  return _globalReducer(state, action);
}
/*
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
  case actionTypes.SET_LOADING_SUB_ACTION_BAR:
    return Object.assign({}, state, { loadingSubActionBar: action.payload.loadingSubActionBar });
  case actionTypes.SET_UNREAD_COUNT:
    return Object.assign({}, state, { unreadCount: action.payload.unreadCount });
  case actionTypes.SET_VERSION:
    return Object.assign({}, state, { version: action.payload.version });
  case actionTypes.UPDATE_UNREAD_COUNT:
    return Object.assign({}, state, {
      unreadCount: Object.assign({}, state.unreadCount, action.payload.unreadCount)
    });
  default:
    return state;
  }
};*/
