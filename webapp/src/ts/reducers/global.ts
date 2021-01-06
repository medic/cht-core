import { createReducer, on } from '@ngrx/store';

import { Actions } from '@mm-actions/global';

const initialState = {
  actionBar: {
    left: {},
    right: {}
  },
  cancelCallback: null,
  currentTab: null,
  snapshotData: null,
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
  translationsLoaded: false,
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
  on(Actions.setSnapshotData, (state, { payload: { snapshotData } }) => {
    return { ...state, snapshotData };
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
  on(Actions.setRightActionBar, (state, { payload: { right } }) => {
    return {
      ...state,
      actionBar: { ...state.actionBar, right }
    };
  }),
  on(Actions.setRightActionBarVerified, (state, { payload: { verified } }) => {
    return {
      ...state,
      actionBar: {
        ...state.actionBar,
        right: { ...state.actionBar?.right, verified },
      },
    };
  }),
  on(Actions.updateRightActionBar, (state, { payload: { right } }) => {
    return {
      ...state,
      actionBar: {
        ...state.actionBar,
        right: { ...state.actionBar?.right, ...right },
      },
    };
  }),
  on(Actions.setEnketoStatus, (state, { payload: { enketoStatus } }) => {
    return {
      ...state,
      enketoStatus: { ...state.enketoStatus, ...enketoStatus },
    };
  }),
  on(Actions.setPrivacyPolicyAccepted, (state, { payload: { accepted } }) => {
    return { ...state, privacyPolicyAccepted: accepted };
  }),
  on(Actions.setShowPrivacyPolicy, (state, { payload: { show } }) => {
    return { ...state, showPrivacyPolicy: show };
  }),
  on(Actions.setCancelCallback, (state, { payload: { cancelCallback } }) => {
    return { ...state, cancelCallback };
  }),
  on(Actions.setLoadingSubActionbar, (state, { payload: { loading } }) => {
    return { ...state, loadingSubActionBar: loading };
  }),
  on(Actions.setUnreadCount, (state, { payload: { unreadCount } }) => {
    return { ...state, unreadCount: unreadCount };
  }),
  on(Actions.updateUnreadCount, (state, { payload: { unreadCount } }) => {
    return { ...state, unreadCount: { ...state.unreadCount, ...unreadCount } };
  }),
  on(Actions.setTranslationsLoaded, (state) => ({ ...state, translationsLoaded: true })),
);

export const globalReducer = (state, action) => {
  return _globalReducer(state, action);
};
