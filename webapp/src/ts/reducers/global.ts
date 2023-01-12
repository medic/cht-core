import { createReducer, on } from '@ngrx/store';

import { Actions } from '@mm-actions/global';

const initialState = {
  actionBar: {
    left: {},
    right: {}
  },
  navigation: {
    cancelCallback: null,
    preventNavigation: null,
    cancelTranslationKey: null,
    recordTelemetry: null,
  },
  currentTab: null,
  snapshotData: null,
  enketoStatus: {
    form: false,
    edited: false,
    saving: false,
    error: null
  },
  facilities: [],
  filters: {}, // Selected criteria to filter data.
  sidebarFilter: {}, // Component state.
  forms: null,
  lastChangedDoc: false,
  loadingContent: false,
  loadingSubActionBar: false,
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
  userFacilityId: null,
  trainingCard: null,
};

const setShowContent = (state, showContent) => {
  if (showContent) {
    $('.app-root').addClass('show-content');
  } else {
    $('.app-root').removeClass('show-content');
  }
  return { ...state, showContent };
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
  on(Actions.setCurrentTab, (state, { payload: { currentTab } }) => {
    return { ...state, currentTab };
  }),
  on(Actions.setSnapshotData, (state, { payload: { snapshotData } }) => {
    return { ...state, snapshotData };
  }),
  on(Actions.setSnackbarContent, (state, { payload: { message, action } }) => {
    return { ...state, snackbarContent: { message, action } };
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
  on(Actions.clearFilters, (state, { payload: { skip } }) => {
    const newValue = skip && state.filters[skip] ? { [skip]: state.filters[skip] } : {};
    return { ...state, filters: newValue };
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
  on(Actions.setSidebarFilter, (state, { payload: { sidebarFilter } }) => {
    return {
      ...state,
      sidebarFilter: { ...state.sidebarFilter, ...sidebarFilter }
    };
  }),
  on(Actions.clearSidebarFilter, (state) => {
    return { ...state, sidebarFilter: {} };
  }),
  on(Actions.setTitle, (state, { payload: { title } }) => {
    return { ...state, title };
  }),
  on(Actions.setShowContent, (state, { payload: { showContent } }) => {
    return setShowContent(state, showContent);
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
  on(Actions.updateLeftActionBar, (state, { payload: { left } }) => {
    return {
      ...state,
      actionBar: {
        ...state.actionBar,
        left: { ...state.actionBar?.left, ...left },
      },
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
      enketoStatus: { ...state.enketoStatus, ...enketoStatus, form: true },
    };
  }),
  on(Actions.clearEnketoStatus, state => ({ ...state, enketoStatus: { ...initialState.enketoStatus } })),
  on(Actions.setPrivacyPolicyAccepted, (state, { payload: { accepted } }) => {
    return { ...state, privacyPolicyAccepted: accepted };
  }),
  on(Actions.setShowPrivacyPolicy, (state, { payload: { show } }) => {
    return { ...state, showPrivacyPolicy: show };
  }),
  on(Actions.setCancelCallback, (state, { payload: { cancelCallback } }) => {
    return {
      ...state,
      navigation: {
        ...state.navigation,
        cancelCallback,
      },
    };
  }),
  on(Actions.setNavigation, (state, { payload }) => {
    const { cancelCallback, preventNavigation, cancelTranslationKey, recordTelemetry } = payload;
    return {
      ...state,
      navigation: {
        ...state.navigation,
        cancelCallback,
        preventNavigation,
        cancelTranslationKey,
        recordTelemetry,
      }
    };
  }),
  on(Actions.setPreventNavigation, (state, { payload: { preventNavigation } }) => {
    return {
      ...state,
      navigation: {
        ...state.navigation,
        preventNavigation,
      },
    };
  }),
  on(Actions.setLoadingSubActionBar, (state, { payload: { loading } }) => {
    return { ...state, loadingSubActionBar: loading };
  }),
  on(Actions.setUnreadCount, (state, { payload: { unreadCount } }) => {
    return { ...state, unreadCount: unreadCount };
  }),
  on(Actions.updateUnreadCount, (state, { payload: { unreadCount } }) => {
    return { ...state, unreadCount: { ...state.unreadCount, ...unreadCount } };
  }),
  on(Actions.setTranslationsLoaded, (state) => ({ ...state, translationsLoaded: true })),
  on(Actions.setUserFacilityId, (state, { payload: { userFacilityId }}) => {
    return { ...state, userFacilityId };
  }),
  on(Actions.setTrainingCard, (state, { payload: { trainingCard }}) => {
    return { ...state, trainingCard };
  }),
);

export const globalReducer = (state, action) => {
  return _globalReducer(state, action);
};
